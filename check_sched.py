import json
data = json.load(open(r'd:\Codding\Study Fly\src\data\schedule.json', encoding='utf-8'))
res = [(d['date'], d['dayType'], [s['topic'] for s in d.get('subjects',[])]) for d in data if '2026-03-21' <= d['date'] <= '2026-03-31']
with open(r'd:\Codding\Study Fly\sched_output.txt', 'w') as f:
    for r in res:
        f.write(str(r) + '\n')
