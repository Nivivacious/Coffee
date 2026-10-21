"""Fetch full ingredient (INCI) lists for data/skincare.json from INCIDecoder.

INCIDecoder's robots.txt allows this. One request at a time; results go to
data/skincare-inci.json with the page each list came from, so every match
can be checked by hand.

    python3 scripts/fetch_skincare.py
"""
import gzip, html, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..')
BASE = 'https://incidecoder.com'
UA = 'Mozilla/5.0 (compatible; swmatch-catalog/1.0)'

def get(path):
    time.sleep(1.0)
    req = urllib.request.Request(path if path.startswith('http') else BASE + path,
                                 headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'})
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read()
        if r.headers.get('Content-Encoding') == 'gzip': body = gzip.decompress(body)
        return body.decode('utf8', 'replace')

words = lambda s: set(re.findall(r'[a-z0-9]+', s.lower().replace('%', ' ')))

def best_hit(query, page):
    hits = re.findall(r'<a href="(/products/[^"]+)"[^>]*class="klavika simpletextlistitem"[^>]*>([^<]+)</a>', page)
    if not hits:
        hits = [(h, h.split('/')[-1].replace('-', ' ')) for h in re.findall(r'href="(/products/(?!create)[^"]+)"', page)]
    q = words(query)
    scored = sorted(((len(q & words(t)) / (len(q | words(t)) or 1), h, html.unescape(t).strip()) for h, t in hits), reverse=True)
    return scored[0] if scored else None

def ingredients(page):
    m = re.search(r'id="showmore-section-ingredlist-short"(.*?)</div>', page, re.S)
    if not m: return []
    text = re.sub(r'<[^>]+>', ' ', m.group(1)).replace('[more]', ' ')
    return [x for x in (html.unescape(t).strip() for t in re.split(r',\s*', re.sub(r'\s+', ' ', text))) if x and len(x) < 120]

def main():
    src = json.load(open(os.path.join(ROOT, 'data/skincare.json')))
    out_path = os.path.join(ROOT, 'data/skincare-inci.json')
    out = json.load(open(out_path)) if os.path.exists(out_path) else {}
    for p in src['products']:
        key = f"{p['brand']}|{p['name']}"
        if key in out and out[key].get('ingredients') and (not p.get('page') or out[key]['url'] == BASE + p['page']): continue
        try:
            # A pinned page wins over search, for products search gets wrong.
            hit = (1.0, p['page'], p['name']) if p.get('page') else best_hit(p['query'], get('/search?query=' + urllib.parse.quote(p['query'])))
            if not hit or hit[0] < 0.3:
                print('no good match:', key, hit and hit[2], file=sys.stderr); continue
            inci = ingredients(get(hit[1]))
            out[key] = {'url': BASE + hit[1], 'matched': hit[2], 'confidence': round(hit[0], 2), 'ingredients': inci}
            print(f'{key} -> {hit[2]} ({hit[0]:.2f}), {len(inci)} ingredients', file=sys.stderr)
        except Exception as e:
            print('failed:', key, e, file=sys.stderr)
        json.dump(out, open(out_path, 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
