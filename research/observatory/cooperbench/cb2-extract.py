import json,glob,os
out=[]
for arm in ["solo","messages","none","field"]:
    for f in sorted(glob.glob(f"logs/cb2-{arm}/*/*/*/*/result.json")):
        d=json.load(open(f)); ep=os.path.join(os.path.dirname(f),"eval.json")
        e=json.load(open(ep)) if os.path.exists(ep) else {}
        ag=d.get("agents") or {"solo":d.get("agent")}
        if isinstance(ag,list): ag={str(i):a for i,a in enumerate(ag)}
        ags=[{k:(v[:160] if isinstance(v,str) else v) for k,v in (a or {}).items() if k in("status","cost","steps","input_tokens","output_tokens","cache_read_tokens","cache_write_tokens","patch_lines","error")} for a in ag.values()]
        m=e.get("merge") if isinstance(e.get("merge"),dict) else {}
        out.append(dict(arm=arm,repo=d["repo"],task=d["task_id"],features=d["features"],dur=round(d.get("duration_seconds") or 0),cost=d.get("total_cost"),steps=d.get("total_steps"),msgs=d.get("messages_sent"),agents=ags,both=e.get("both_passed"),f1=(e.get("feature1") or {}).get("passed"),f2=(e.get("feature2") or {}).get("passed"),merge=m.get("status"),strategy=m.get("strategy"),apply=e.get("apply_status"),everr=(e.get("error") or "")[:160] if e.get("error") else None))
print(json.dumps(out))
