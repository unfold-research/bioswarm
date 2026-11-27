"""Export Silo-Bench instances for T2 (tasks/T2-TRIGGER-DESIGN.md).

Calls the unmodified Silo-Bench generators (jwyjohn/acl26-silo-bench, The Unlicense) at a pinned commit.
The benchmark makes one instance per size with a fixed seed; this script reseeds Python's global generator before
each call so that a cell (task, M shards) has several instances. Nothing else of the generator is changed.

  python3 -I export.py <checkout>/benchmark_generator <outdir> [--sizes 32,128 | --only 1,2,4,8] [--instances 16] [--tasks I-01,I-05]

Writes one file per cell and manifest.json (pinned commit, leak probe, chosen tasks, SHA-256 of every file).

A task is a candidate if its answer is one integer shared by all agents. The leak probe draws PROBE instances per
cell and measures how often the most common answer of the cell is right: a task whose answer can be guessed without
reading the data (Global Max saturates at 1000 once there are enough numbers) is dropped. The first PER_LEVEL
candidates of each level, in the benchmark's numbering, that pass at every size are the tasks of the study.
"""
import contextlib, hashlib, io, json, os, random, subprocess, sys
from collections import Counter

PINNED = 'e74127782ed1c42fff474249961f022c063d76f2'
SIZES = [16, 64, 256, 1024]             # M, the number of shards. 4 is left out: with so little data several answers
                                         # can be guessed (III-26 0.25, III-23 0.475 modal share). Extra sizes: --sizes 32,128
INSTANCES = 12                           # per cell: the first four are calibration, the other eight are test
PROBE, MAX_MODAL = 200, 0.2
PER_LEVEL = 3
CANDIDATES = [                           # integer answer, same for every agent
    ('I-01', 'paradigm_i', '_generate_i01_global_max'), ('I-02', 'paradigm_i', '_generate_i02_word_frequency'),
    ('I-05', 'paradigm_i', '_generate_i05_range_count'), ('I-06', 'paradigm_i', '_generate_i06_checksum'),
    ('I-08', 'paradigm_i', '_generate_i08_set_union_size'),
    ('III-22', 'paradigm_iii', '_generate_iii22_median'), ('III-23', 'paradigm_iii', '_generate_iii23_graph_components'),
    ('III-26', 'paradigm_iii', '_generate_iii26_global_distinct'),
]
KEEP = ('Task', 'Data Distribution', 'Output')   # blocks of the benchmark's statement kept; protocol blocks dropped


def seed_of(task, m, i):
    return int(hashlib.sha256(f'silo-t2:{task}:{m}:{i}'.encode()).hexdigest()[:12], 16)


def statement(text):
    blocks, out = text.split('\n\n'), []
    for j, b in enumerate(blocks):
        head = b.split(':**')[0].lstrip('*') if b.startswith('**') else None
        if head is None:
            if j == 1: out.append(b)           # the sentence that states the objective
        elif any(head.startswith(k) for k in KEEP): out.append(b)
    return '\n\n'.join(out)


def main():
    gen_dir, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    extra = [int(x) for x in sys.argv[sys.argv.index('--sizes') + 1].split(',')] if '--sizes' in sys.argv else []
    sizes = sorted(set(SIZES + extra))
    arg = lambda flag: sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else None
    instances = int(arg('--instances') or INSTANCES)                      # instance i has the same seed in every set
    named = arg('--tasks').split(',') if arg('--tasks') else None        # a fixed task list; each must still pass the probe
    if '--only' in sys.argv: sizes = sorted(int(x) for x in sys.argv[sys.argv.index('--only') + 1].split(','))   # another set of sizes, with its own probe and manifest
    head = subprocess.run(['git', '-C', gen_dir, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    if head != PINNED: raise SystemExit(f'generator checkout is at {head}, expected {PINNED}')
    sys.path.insert(0, gen_dir)
    with contextlib.redirect_stdout(io.StringIO()):
        import main as g
        mods = {n: __import__(n) for n in ('paradigm_i', 'paradigm_iii')}
        builder = g.BenchmarkGenerator(num_agents=2, output_dir=os.path.join(out, '.generator-scratch'))

    def make(mod, fn, task, m, i):
        builder.num_agents = m
        random.seed(seed_of(task, m, i))
        with contextlib.redirect_stdout(io.StringIO()):
            c = getattr(mods[mod], fn)(m, builder._create_case_structure)
        vals = c['expected_output']['per_agent_values']
        if c['metadata']['is_segmented'] or len(set(json.dumps(v) for v in vals)) != 1 or not isinstance(vals[0], int) or isinstance(vals[0], bool):
            raise SystemExit(f'{task}: not a single shared integer')
        shards = [a['input_shard'] for a in c['agent_configs']]
        if len(shards) != m: raise SystemExit(f'{task}: {len(shards)} shards for M={m}')
        return c, shards, vals[0]

    probe = {}
    for task, mod, fn in CANDIDATES:
        probe[task] = {}
        for m in sizes:
            answers = Counter(make(mod, fn, task, m, 1000 + i)[2] for i in range(PROBE))   # probe seeds are disjoint from the instances
            probe[task][str(m)] = round(answers.most_common(1)[0][1] / PROBE, 3)
    passed = [t for t, _, _ in CANDIDATES if max(probe[t].values()) <= MAX_MODAL]
    chosen = [t for level in ('I-', 'III-') for t in [x for x in passed if x.startswith(level)][:PER_LEVEL]]
    if named:
        failed = [t for t in named if t not in passed]
        if failed: raise SystemExit(f'named tasks fail the leak probe: {failed} {[probe[t] for t in failed]}')
        chosen = named

    os.makedirs(out, exist_ok=True)
    files = {}
    for task, mod, fn in CANDIDATES:
        if task not in chosen: continue
        for m in sizes:
            rows, text, name = [], None, None
            for i in range(instances):
                c, shards, answer = make(mod, fn, task, m, i)
                rows.append({'i': i, 'seed': seed_of(task, m, i), 'answer': answer, 'shards': shards})
                if i == 0: name = c['case_name']
                text = statement(c['task_description']) if text is None else text
            body = json.dumps({'task': task, 'name': name, 'level': task.split('-')[0], 'M': m, 'statement': text, 'instances': rows}, separators=(',', ':'), sort_keys=True)
            fname = f'{task}_M{m}.json'
            with open(os.path.join(out, fname), 'w') as f: f.write(body + '\n')
            files[fname] = hashlib.sha256((body + '\n').encode()).hexdigest()
    manifest = {'source': 'jwyjohn/acl26-silo-bench', 'commit': PINNED, 'sizes': sizes, 'instances': instances,
                'probe': {'instancesPerCell': PROBE, 'maxModalShare': MAX_MODAL, 'modalShare': probe, 'passed': passed}, 'tasks': chosen, 'files': files}
    with open(os.path.join(out, 'manifest.json'), 'w') as f: f.write(json.dumps(manifest, indent=2, sort_keys=True) + '\n')
    print(json.dumps({'tasks': chosen, 'passed': passed, 'modalShare': probe}, indent=1))


main()
