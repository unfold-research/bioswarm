// GN1 build B3: proof that the family generator left every earlier instance unchanged (tasks/GN1-MEMORY-PREREG.md:
// "makeInstance and every earlier instance unchanged"). Three checks:
//   1. code.mjs is main's code.mjs at 4db6bd2 plus the trailing POOLS export and nothing else (source hash);
//   2. makeInstance(k, seed, shape) gives the same instance as on main for the first and last case seed of every rc
//      config and sweep config of earlier LI studies (85 instances, k 5 to 160): specs, names, checks, test inputs and the
//      reference outputs on them (fingerprints computed from main's code.mjs at 4db6bd2);
//   3. the same fingerprints still hold after GN1 families were built in the same process (family.mjs shares the pools
//      and draws of code.mjs; a pool mutated in place would change later instances).
// Run: node --test observatory/batch2/rc/family.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeInstance, POOLS } from './code.mjs';
import { makeSequence } from './family.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const fingerprint = (inst) => sha(JSON.stringify({ k: inst.k, seed: inst.seed, specs: inst.specs, names: inst.names, shown: inst.shown, hash: inst.hash,
  checks: inst.checks.map((c) => ({ ...Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v !== 'function')), src: Object.entries(c).filter(([, v]) => typeof v === 'function').map(([n, v]) => n + ':' + v.toString()),
    out: c.kind === 'symmetric' ? null : c.inputs.map((s) => [c.ref(s), c.hRef ? c.hRef(s) : null]) })) }));

const MAIN_CODE_SHA = 'c361380ec1a083120816f54d622ec1033d7597b06cc873d9bd5ad5544c55d583'; // git show 4db6bd2:observatory/batch2/rc/code.mjs | sha256sum
const MAKE_INSTANCE_SHA = '7b330415487aee7f42860730462e63cc92163a87a81b32ebf973b17be019bcf3';
// [k, seed, shape (null: default), fingerprint on main at 4db6bd2] // source config
const OLD = [
  [5,1,null,"31b28d3fb1acc35b2e724cc46a29d12cdd6e745fd36ed2699152cc6f5535f241"], // default shape
  [8,3,null,"3061bab8549703e60d3fec6b34a1c7b3581488bb6998c35f62d5a68365e97181"], // default shape
  [40,10400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"78f09dcda79dc954d3856b265655f0e4dad3b9a3c2a5ac110d41bdc4e02f5fd1"], // li10-k40.json
  [40,10407,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"ac5ccc67abc83d62f417e8030255d1360ceec568a2d2e634faf132a0609b8d7d"], // li10-k40.json
  [80,10800,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"065a2e693e64265a8a7a1adc8b12ddda0672c9fce7f6e759ccebaa648e178d5f"], // li10-k80.json
  [80,10807,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"7c7987600833437143e830611d260ee2805f90514327a87fc9513515d8cce084"], // li10-k80.json
  [40,11400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"566d0ec023650e22cb0ce716638a9643032152344da3e73ceb54593ffbfaae68"], // li11-k40.json
  [40,11407,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"7bf2c9200f154ea493ba7bab0a59b5e365f6510ac803db20c0c775290b777e3f"], // li11-k40.json
  [80,11800,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"58d105cb028079b537aebf3e956bd9b152f7e5dff4c07bcf515c61c719be56ac"], // li11-k80.json
  [80,11807,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"3a43fd7fe7b5973b86a8bd500eb63c999e2014538c9e384d88d6769c29e1de9b"], // li11-k80.json
  [40,12400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"7a1e32e445579345f9b8dd32e04d1db98e7e2473647ccfb0af4d68ee1facd93c"], // li12-k40.json
  [40,12407,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"d6d27f3808d895ead358a7ef1f73d8890b901acc608d77d0eae7d87eff603c2f"], // li12-k40.json
  [80,12800,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"c46e4d406218286b7038ee8f934121fabf3be13c6c85999c57987382cff51497"], // li12-k80.json
  [80,12807,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"c842b535c550a3585748e867b70d341444c76ed5fd5f426bb74dca5be60c1b8c"], // li12-k80.json
  [40,12900,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"131166f4d58a542de137a5b10ab7de38c535586f523c929e05a444abe8a5eac6"], // li12r-k40.json
  [40,12907,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"dc789afbdf021d6a7fddedefe7997a9dc8cda7d0b87134da95f1b6bc46881e35"], // li12r-k40.json
  [5,13900,{"local":2,"directed":5,"symmetric":4,"tests":8,"shown":3},"5fc53bec9a9262ce9eb6e92244d9999817ad12ece04b2fe7e11b692be85c8c53"], // li13-pilot.json
  [40,14400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"5e9a3ebf853c4e90d9e55d92da4961d08a97c999afc4f24c3dc5e94703c16005"], // li14-k40.json
  [40,14407,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"3a9a436e838ced9d202d959c9087f69854b36ffb7cbd60ac1850d81f59c7edad"], // li14-k40.json
  [80,14800,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"58dbf90302332c76ddb01c2a2f1f7d6a8b652e08f972a26f1b95ed698cc446ae"], // li14-k80.json
  [80,14807,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"38b3c333491a43836df7ff79b76e8b4055ea7932690ec74474b51b5924c42592"], // li14-k80.json
  [5,7900,{"local":2,"directed":5,"symmetric":4,"tests":6,"shown":3},"cf5edd85dc81ae1bf76482f61ba603183e1089520ee2b6df1f677d7083e97b14"], // li7-pilot.json
  [5,7901,{"local":2,"directed":5,"symmetric":4,"tests":6,"shown":3},"07b9547b8c2ec75424a4640d3e306e434d645b72e7c708eed3e288a8f6e05e67"], // li7-pilot.json
  [12,9200,{"local":2,"directed":12,"symmetric":10,"tests":8,"shown":3},"63d2a1ee5fb73e35021311b909b3a8f2ca108016d840e9039f34cd3c35f897de"], // li8-k12.json
  [12,9209,{"local":2,"directed":12,"symmetric":10,"tests":8,"shown":3},"c43ffc935ba91b80e3143da59abe394e4a02878e24fea125a73bfb9f83285dd8"], // li8-k12.json
  [5,8500,{"local":2,"directed":5,"symmetric":4,"tests":8,"shown":3},"a6e77f5254f5942f1b190e7e112d25023e4b54a683c7174b3f59a54a85f6b1b2"], // li8-k5.json
  [5,8509,{"local":2,"directed":5,"symmetric":4,"tests":8,"shown":3},"81e33e83371c0934d331fb2ae5cab63948b8889f16f7c01dca928882d02e107e"], // li8-k5.json
  [12,9700,{"local":2,"directed":12,"symmetric":10,"tests":8,"shown":3},"9735fe717cce924daa58ade0add0cad519c49407772c772aa3a37b40eb80719d"], // li9-k12.json
  [12,9709,{"local":2,"directed":12,"symmetric":10,"tests":8,"shown":3},"286cdbe3d043306a40ac841a4fb1ba3fcac3929105d54c2288ed01756cf5011b"], // li9-k12.json
  [5,9600,{"local":2,"directed":5,"symmetric":4,"tests":8,"shown":3},"28e4851806b1bcdcf4835f562a1d30f609747cf38d3a1cd99ef07d96f55fb6a3"], // li9-k5.json
  [5,9609,{"local":2,"directed":5,"symmetric":4,"tests":8,"shown":3},"e9c69b7e885a44bfd41805e6e8275b3824d488bd6460d4f706c175678ca582c1"], // li9-k5.json
  [40,16400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"b23631b7e50aaf032b0c681ba2ecbd4d7b8c37fe8023ae4ae9202a8b24cc51c2"], // sweeps/li16-k40.json
  [40,16407,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"f6b0811763aa50f135db0a3a2fd943ba18873e7b15eaf5096de7b2f765b5b0f4"], // sweeps/li16-k40.json
  [80,16800,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"151db9db446c7d726dd6bdb0d360efebec00b31195c702bb9a196947a501b26f"], // sweeps/li16-k80.json
  [80,16807,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"e33948300dff3e36c1d104eaa18a96618cdffa77c70ed2f8b1a3b03eb26653f4"], // sweeps/li16-k80.json
  [40,17400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"a98aa19bf106ecffc63e9a1b99c7f684a7e4c2f3f95d74e5b7d4e401240c2786"], // sweeps/li17-k40.json
  [40,17407,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"e22731cfbf1ad9e4f30fb0ed3a1a62da15a3943679c71cbf70051b304bee6ce8"], // sweeps/li17-k40.json
  [80,17800,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"6a1259e6347eae3b486e0a9d504a06601320cab6be41cda4be2bc54caea1ec62"], // sweeps/li17-k80.json
  [80,17807,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"3bb8e7e54264818a86f51d7d4be5aad454a2f009f69c58dba2894dc2fb16f161"], // sweeps/li17-k80.json
  [40,18400,{"local":2,"directed":40,"symmetric":30,"tests":16,"shown":3},"f36badb3f26d47b198e7e99ec4f6ebb1c89f845f9ab588ab17206a3f31328623"], // sweeps/li18-k40.json
  [40,18407,{"local":2,"directed":40,"symmetric":30,"tests":16,"shown":3},"ecf2bb901b18ec891b4968a77ef2bf76c9f35978610fb60c184d101e6e512b9b"], // sweeps/li18-k40.json
  [80,18800,{"local":2,"directed":80,"symmetric":60,"tests":16,"shown":3},"6b2d898c34a0fd4f657e5bbc80efd0386970dcf2a1510fc57855a22a88814dbb"], // sweeps/li18-k80.json
  [80,18807,{"local":2,"directed":80,"symmetric":60,"tests":16,"shown":3},"aef6dfaea7fb7110651968870d014e7a07e15f9e16e82a9a9922b0ec94cc6b3b"], // sweeps/li18-k80.json
  [120,19200,{"local":2,"directed":240,"symmetric":80,"tests":16,"shown":3},"f994dd060601a667be796a78239e8cc311280b6cccc0dfaa9ffb30f75e1f3c4d"], // sweeps/li19-k120.json
  [120,19207,{"local":2,"directed":240,"symmetric":80,"tests":16,"shown":3},"4c641b9d4a045ab99b4eeb3da3b79173a1f91593140c9f180be582ec04924ee1"], // sweeps/li19-k120.json
  [80,19800,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"92d4c7ec7df25a6637c1f10de68d23111c307ebe103c4f19216c8c657a70c328"], // sweeps/li19-k80.json
  [80,19807,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"02a4946a619a01c5fdaccafef9a7b74e1a0ef7409c129304489ba33a032a28fd"], // sweeps/li19-k80.json
  [40,21400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"954354001f8c948c41363a586046149fde3a68b43cf56507c350827b72332c81"], // sweeps/li21-k40.json
  [40,21407,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"5168b8357c3bcae6b6ebdff6c19952a916e920049c45e67d35ed9a0a8870e925"], // sweeps/li21-k40.json
  [40,22400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"075671e71672610288a39924c821fff42d4d7f751f0e8f0863b7e772f2fd8d8f"], // sweeps/li22-k40.json
  [40,22407,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"c26cd45dce950d7d8b35fe9f6a3144c9d17a6e8821a94038adce68d16b5ee4de"], // sweeps/li22-k40.json
  [40,23400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"45d0bac410bc3597c7d75638d2fde5843cbf2d48b5d947b11e2c2dfb227d107b"], // sweeps/li23-k40.json
  [40,23407,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"896f52ea5a468bd0402752496eb4fa3f92a008fdc49ff6d452b100de03cf9ea4"], // sweeps/li23-k40.json
  [80,23800,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"f3f1e68f7fe53a5e75a1fa2a793292cbad6d748c1015411fcb01741af58467bf"], // sweeps/li23-k80.json
  [80,23807,{"local":2,"directed":80,"symmetric":60,"tests":8,"shown":3},"80a759d6b816d4d0882f151d379b9c6bb884d20bb54d41f60737d06292ef3467"], // sweeps/li23-k80.json
  [120,24200,{"local":2,"directed":240,"symmetric":80,"tests":16,"shown":3},"f893212098bebcb7f9c65d09b71f8205210692add4cfca0800f347cbef4d85da"], // sweeps/li24-k120.json
  [120,24207,{"local":2,"directed":240,"symmetric":80,"tests":16,"shown":3},"dda246e12065cf7bdb0290fedaf007262d952dfdd63ee7994355f90458c0be3b"], // sweeps/li24-k120.json
  [80,24800,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"fc9331783079c525890b32ec06e54e029206739e9c48c8263e052b860c009bf6"], // sweeps/li24-k80.json
  [80,24807,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"bcb738a787cb68cfa2df3c5baa241d15652af0f56311879f505c729a500059e2"], // sweeps/li24-k80.json
  [160,26600,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"41d70d25d4c022f6fe0500f035128e0be67cc552fc019a1afaeb688cd3b6aa93"], // sweeps/li26-k160.json
  [160,26607,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"c3cf4291a76965986d22d3dc48c791f35563b068e8a78769de6b8c9ba6c64d3a"], // sweeps/li26-k160.json
  [160,27600,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"abab82e925a98880a550597f73c349da06a57c581c4e6fd03ab2b61a9fb92ee7"], // sweeps/li27-k160.json
  [160,27611,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"f9c9cf11b83ae99546fcd4f969bc87ddbe9faf1f1f10799fb180acddc74044a2"], // sweeps/li27-k160.json
  [80,27800,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"40d0bdcb76b2c7bbc05b0cca2d788cdc0a50c871d0a995d5027350bad5f3a0fa"], // sweeps/li27-k80.json
  [80,27811,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"9abcca12315eba50ba5bd763d721b62b99925aef7a9a79a8857d2a35920c1ac7"], // sweeps/li27-k80.json
  [80,28800,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"fa0b2a60a6678e22dfe4433d31fe5180650d0d46b7d8043a4b5183df67f80f7b"], // sweeps/li28-k80.json
  [80,28811,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"17758d62850fa608bd8c5de06157a3ff11673921ab6eb5c0b2554d2b4a7562c0"], // sweeps/li28-k80.json
  [80,28900,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"c0e5137095b0e00f6b5c9bc24b64600e1554246dc6aaa8a848d585b8ef779d61"], // sweeps/li28r-k80.json
  [80,28911,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"797da83c5582838042a3d90707f5de1ef1c6da8ad3607c5a68dca4d36337f07c"], // sweeps/li28r-k80.json
  [80,30800,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"0d1ba862dcffe7eb6128d2c2822e4699a1677013dfa907bce400ef92416d35cc"], // sweeps/li30-k80.json
  [80,30811,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"ab27fccd4285cc157c3fcb1bd933ede91c7c642e17f5939226a5fe47ff256561"], // sweeps/li30-k80.json
  [160,33600,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"cc1d43ad5a7e71c9fc23b137cc6d2417294db81bd1e2dcfcae960b56330e8b2c"], // sweeps/li33-k160.json
  [160,33611,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"cb97278292d186b4ef038a71d30d6808f21feed30337b4eaf76c0188faa925ba"], // sweeps/li33-k160.json
  [80,33800,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"fcf732a0ae4b7e301b0f282c8cc6cf82b1656da8710ee3e52cf48710fc01b3a8"], // sweeps/li33-k80.json
  [80,33815,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"9342af8f6a2171fff3e79a9f4ddce0c35348de8df84aba6a61c0741b24b36ae3"], // sweeps/li33-k80.json
  [120,34200,{"local":2,"directed":240,"symmetric":80,"tests":16,"shown":3},"1eb1e2b71dcc233f87620d41f2df899e6b72c7eab86602ca5bdc4a5bc4f223b6"], // sweeps/li34-k120.json
  [120,34211,{"local":2,"directed":240,"symmetric":80,"tests":16,"shown":3},"8c1dac972afe3382c812d0fbcd1c24b27e41a7bd5836741a111b7d1bd6ad002d"], // sweeps/li34-k120.json
  [80,34800,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"c0f80a93fe7b1f29bb050c7f9e5dbf46ae9202848c331f25bea4a7d53d4626dd"], // sweeps/li34-k80.json
  [80,34811,{"local":2,"directed":160,"symmetric":80,"tests":16,"shown":3},"59f9e618eb03b7eda5aeca5f563798dc79192d5f558c27172dd64fe6c0a5577b"], // sweeps/li34-k80.json
  [40,35400,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"7ff572ee3e4e4db04377f22f2e0c3d4fde2fb4e2064d167eefff6b0ab55c4a7c"], // sweeps/li35-k40.json
  [40,35411,{"local":2,"directed":40,"symmetric":30,"tests":8,"shown":3},"4f98cb8e55c2c6acb34b2cf51859b7c229bc8e16eaef9ca6165db91dae7052d7"], // sweeps/li35-k40.json
  [120,36200,{"local":2,"directed":240,"symmetric":80,"tests":16,"shown":3},"8953599ad80d7d4f638a12e40ddeb5d6247acf82693587f9f76e2985a513f27e"], // sweeps/li36-k120.json
  [120,36211,{"local":2,"directed":240,"symmetric":80,"tests":16,"shown":3},"6a65cef426c2b8779a29fe7b5936e39d3277e53e68e67bece1da5430ac4816d5"], // sweeps/li36-k120.json
  [160,38400,{"local":2,"directed":320,"symmetric":80,"tests":16,"shown":3},"f4bbd65a1d63a6538336855a53b9838d4e2e50774436606725950ba17eceb7d9"], // sweeps/li38-k160.json
  [160,38411,{"local":2,"directed":320,"symmetric":80,"tests":16,"shown":3},"02716737dad028b0f85ef8ec90897387c2b2312fc8ed744ff49351847a4255a8"], // sweeps/li38-k160.json
];

const checkAll = () => { for (const [k, seed, shape, want] of OLD) assert.equal(fingerprint(makeInstance(k, seed, shape || undefined)), want, `instance k${k} s${seed} changed`); };

test('code.mjs is main plus the POOLS export only', () => {
  const src = fs.readFileSync(path.join(HERE, 'code.mjs'), 'utf8'), at = src.lastIndexOf('\n// GN1 (family.mjs');
  assert.ok(at > 0, 'GN1 block not found at the end of code.mjs');
  assert.equal(sha(src.slice(0, at)), MAIN_CODE_SHA, 'code.mjs before the GN1 block differs from main');
  assert.match(src.slice(at), /^\n\/\/ GN1[^\n]*\n\/\/[^\n]*\nexport const POOLS = Object\.freeze\(\{[^}]*\}\);\n$/, 'the GN1 block holds only the POOLS export');
  assert.equal(sha(makeInstance.toString()), MAKE_INSTANCE_SHA, 'makeInstance source changed');
  assert.ok(Object.isFrozen(POOLS));
});

test('earlier instances unchanged', () => { assert.equal(OLD.length, 85); checkAll(); });

test('earlier instances unchanged after building GN1 families in the same process', () => {
  const pools = JSON.stringify(Object.fromEntries(Object.entries(POOLS).filter(([, v]) => typeof v !== 'function')));
  makeSequence(51000); makeSequence(51100, { type: 'control' }); makeSequence(50990, { cases: 2 });
  assert.equal(JSON.stringify(Object.fromEntries(Object.entries(POOLS).filter(([, v]) => typeof v !== 'function'))), pools, 'a pool changed');
  checkAll();
});
