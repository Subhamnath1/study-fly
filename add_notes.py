import json

links = [
    "https://drive.google.com/file/d/1drk5DrhUPMCMHhYG7FkKZAacLfSK-sEr/view?usp=drive_link",
    "https://drive.google.com/file/d/1SDRFUMebJ54Xs5cNgRZIwybMXK5xFb4p/view?usp=drive_link",
    "https://drive.google.com/file/d/1bWmE6aMJwXoA5_3N_aTLPwQGBU8bVzu8/view?usp=drive_link",
    "https://drive.google.com/file/d/1838F_csNw1uwXTbpbBu80VD1ZsoTlOar/view?usp=drive_link",
    "https://drive.google.com/file/d/1qdFc1qgeUwHuNfIiPucjp2pAC2Vtq2O_/view?usp=drive_link",
    "https://drive.google.com/file/d/1420p08C6VU71ewbFhNG9f9uzY0gs9aq7/view?usp=drive_link",
    "https://drive.google.com/file/d/1RiTsLkcDruKyCbS7Zdpr5JmwwCfxRotl/view?usp=drive_link",
    "https://drive.google.com/file/d/17h3K3DZCSacfUwUyHDvSriFt695X1Yvt/view?usp=drive_link",
    "https://drive.google.com/file/d/19d9AnMGmwq74pEtuXNjB8iImViEht4fc/view?usp=drive_link",
    "https://drive.google.com/file/d/1c4Tx7ixOo-wpB4RJsF8l6WevsMc3hq4P/view?usp=drive_link",
    "https://drive.google.com/file/d/1bTrgzhRTbPa5LFNN3rtr5c3ojVL20OXF/view?usp=drive_link",
    "https://drive.google.com/file/d/1C6BTp4X1dxZR9YMYThKiQkkbQegPJuHR/view?usp=drive_link",
    "https://drive.google.com/file/d/1ATTBUSnMM9xO-jdzf1hKCEzhqbvTmiH4/view?usp=drive_link",
    "https://drive.google.com/file/d/14MS-JkJiKgjinCWmBD6P8ivEjWN4G64B/view?usp=drive_link",
    "https://drive.google.com/file/d/1dubEruhzDdY_2rJi0r_ImK39zyfAu3cA/view?usp=drive_link",
    "https://drive.google.com/file/d/1lU5CiuGsTAkjZ-yP8xU3NwyVAPCnPpiO/view?usp=drive_link",
    "https://drive.google.com/file/d/1D3BJd0HbDkXTcgCHtA9WtCdZhg1uWR-e/view?usp=drive_link",
    "https://drive.google.com/file/d/19yK8sg_hydGsss12lWXNebGWVQ82G96E/view?usp=drive_link"
]

with open('d:/Codding/Study Fly/src/data/schedule.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

link_idx = 0
updated_count = 0

for day in data:
    for subj in day.get('subjects', []):
        if subj.get('chapterName') == 'Electric Charges & Fields' and subj.get('subject') == 'Physics' and day.get('dayType') == 'CLASS':
            if link_idx < len(links):
                if 'resourceLinks' not in subj:
                    subj['resourceLinks'] = {}
                subj['resourceLinks']['notes'] = links[link_idx]
                print(f"Assigning link {link_idx+1} to {subj.get('topic')}")
                link_idx += 1
                updated_count += 1

with open('d:/Codding/Study Fly/src/data/schedule.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)

print(f"Updated {updated_count} lectures with notes out of {len(links)} links provided.")
