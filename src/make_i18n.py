import json, sys
sys.path.insert(0, '/home/claude/cf/src')
from i18n_src import T
d = {}
for zh, en, ms in T: d[zh] = [en, ms]
json.dump(d, open('/home/claude/cf/src/i18n.json', 'w'), ensure_ascii=False, indent=0)
print(len(d), 'entries')
