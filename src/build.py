import json, base64, glob, os, sys
VARIANT = sys.argv[1] if len(sys.argv) > 1 else 'vita'
CONF = {
  'vita': {'brand': {'name': 'Vita Wellness 143', 'sub': 'NC Loyalty Program', 'short': 'Vita 143'}, 'icons': '/home/claude/icons', 'out': 'dist'},
  'template': {'brand': {'name': '我的营养俱乐部', 'sub': 'NC Loyalty Program', 'short': 'NC Club'}, 'icons': '/home/claude/icons/generic', 'out': 'dist-template'},
}[VARIANT]
root = '/home/claude/cf'
exp = f'{root}/export'

def load(col):
    out = []
    for p in sorted(glob.glob(f'{exp}/{col}/*.json')):
        d = json.load(open(p)); d['id'] = os.path.basename(p)[:-5]; out.append(d)
    return out

rewards = load('rewards')
photos = {}
for r in rewards:
    f = f'/home/claude/gifts/{r["id"]}.jpg'
    if os.path.exists(f):
        pid = 'g' + r['id']
        photos[pid] = {'type': 'image/jpeg', 'data': base64.b64encode(open(f, 'rb').read()).decode()}
        r['photo'] = pid
    else:
        r['photo'] = None
    r['photoUrl'] = None

tasks = load('tasks')
settings = load('settings')
for st in settings:
    st.pop('qrKey', None)  # a fresh key is made on first start
    st['photo'] = None; st['photoUrl'] = None

seed = {'rewards': rewards, 'tasks': tasks, 'settings': settings}
# The app and the server are kept in small parts (src/app/, src/server/), joined here in file-name order.
def joined(d):
    return ''.join(open(f).read() for f in sorted(glob.glob(f'{root}/src/{d}/*')) if os.path.isfile(f))
html = joined('app')
srv = joined('server')

# The 21-day course: one file per day (src/course/days/dayNN.json) -> public/course/index.html
days = [json.load(open(f)) for f in sorted(glob.glob(f'{root}/src/course/days/day*.json'))]
assert [d['day'] for d in days] == list(range(1, 22)), 'need day01.json .. day21.json'
def js(v): return json.dumps(v, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
course = (open(f'{root}/src/course/page-top.html').read()
  + 'window.DAYS = ' + js([d['zh'] for d in days]) + ';\n'
  + 'window.QUESTIONS = ' + js([d['quiz']['zh'] for d in days]) + ';\n</script>\n<script>\n'
  + 'window.DAYS_I18N=' + js({l: [d[l] for d in days] for l in ('en', 'ms')}) + ';\n'
  + 'window.QS_I18N=' + js({l: [d['quiz'][l] for d in days] for l in ('en', 'ms')}) + ';\n'
  + open(f'{root}/src/course/page-bottom.html').read())
os.makedirs(f'{root}/public/course', exist_ok=True)
open(f'{root}/public/course/index.html', 'w').write(course)
course_titles = json.dumps({l: [d[l]['t'] for d in days] for l in ('zh', 'en', 'ms')}, ensure_ascii=False, separators=(',', ':'))
import re as _re
srv = srv.replace('__PUSHLIB__', _re.sub(r'^export ', '', open(f'{root}/src/push.js').read(), flags=_re.M))
icons = {str(n): base64.b64encode(open(f"{CONF['icons']}/icon-{n}.png",'rb').read()).decode() for n in (512,192,180,64)}
brand_json = json.dumps(CONF['brand'], ensure_ascii=False)
html = html.replace('__C21__', course_titles)
html = html.replace('__BRAND__', brand_json).replace('__I18N__', json.dumps(json.load(open(f'{root}/src/i18n.json')), ensure_ascii=False))
srv = srv.replace('__BRAND__', brand_json)
srv = srv.replace('__ICONS__', json.dumps(icons))
import hashlib as _h
VER = _h.sha256((html + srv).encode()).hexdigest()[:12]
html = html.replace('__VER__', VER); srv = srv.replace('__VER__', VER)
out = (srv.replace('__HTML__', json.dumps(html, ensure_ascii=False))
          .replace('__SEED__', json.dumps(seed, ensure_ascii=False))
          .replace('__PHOTOS__', json.dumps(photos)))
os.makedirs(f"{root}/{CONF['out']}", exist_ok=True)
open(f"{root}/{CONF['out']}/worker.js", 'w').write(out)
print(VARIANT, 'worker.js', len(out.encode()), 'bytes;', len(rewards), 'rewards,', len(tasks), 'tasks,', len(photos), 'photos')
