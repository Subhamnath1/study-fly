import json
data = json.load(open(r'd:\Codding\Study Fly\src\data\schedule.json', encoding='utf-8'))
res = [(d['date'], s.get('topic'), s.get('videoId')) for d in data for s in d.get('subjects',[]) if s.get('subject')=='Math' and s.get('chapterName')=='Relations and Functions']
for r in res: print(r)
