"""Add product photo URLs to data/purplle-raw.json.

For each product family, reads one product page (an allowed path) to get its
id, then the shade list Purplle's own site uses, and stores each shade's
primary product image URL. One request at a time.

    python3 scripts/fetch_purplle_images.py
"""
import json, os, re, sys, time, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..')
RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'data', 'purplle-raw.json')
UA = 'Mozilla/5.0 (compatible; swmatch-catalog/1.0)'

def get(url):
    time.sleep(0.4)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf8', 'replace')

def main():
    raw = json.load(open(RAW))
    done = 0
    for fam in raw['products']:
        if all(s.get('image') for s in fam['shades']):
            continue
        url = fam['shades'][0]['url']
        slug = url.rsplit('/', 1)[-1]
        try:
            page = get(url)
            m = re.search(r'product_id:(\d+),slug:"' + re.escape(slug) + '"', page) or re.search(r'"product_id"\s*:\s*"?(\d+)', page) or re.search(r'product_id:(\d+)', page)
            if not m:
                print('no id', slug, file=sys.stderr); continue
            v = json.loads(get(f'https://www.purplle.com/neo/catalog/variants/{m.group(1)}')).get('variants', {})
            rows = (v.get('Shades') or v.get('Colors') or v.get('Colours') or {}).get('items') or []
            by_slug = {}
            for row in rows:
                w = row.get('item_widget') or {}
                img = w.get('primary_image_url') or w.get('thumb_image_url') or ''
                if img: by_slug[row.get('slug')] = re.sub(r'/tr:[^/]+/', '/tr:w-480,c-at_max/', img)
            for s in fam['shades']:
                s['image'] = by_slug.get(s['url'].rsplit('/', 1)[-1]) or s.get('image')
            done += 1
            if done % 10 == 0:
                json.dump(raw, open(RAW, 'w'), ensure_ascii=False, indent=1)
                print('families with images:', done, file=sys.stderr)
        except Exception as e:
            print('failed', slug, e, file=sys.stderr)
    json.dump(raw, open(RAW, 'w'), ensure_ascii=False, indent=1)
    have = sum(1 for f in raw['products'] for s in f['shades'] if s.get('image'))
    print(f'done: {have} shades have a photo', file=sys.stderr)

if __name__ == '__main__':
    main()
