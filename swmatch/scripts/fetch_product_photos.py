"""Product photos for ranges Purplle doesn't sell (prestige makeup, skincare).

For each such product in data/catalog.js, searches INCIDecoder for brand + range,
takes the closest match, and stores the product's front photo URL in
data/product-photos.json (keyed by catalog product id). One request at a time;
robots.txt allows product and search pages.

    python3 scripts/fetch_product_photos.py
"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from fetch_skincare import get, best_hit

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'data', 'product-photos.json')

def catalog():
    src = open(os.path.join(ROOT, 'data', 'catalog.js'), encoding='utf8').read()
    return json.loads(src[src.index('{'):src.rindex('}') + 1])

GENERIC = {'lipstick', 'lip', 'matte', 'blush', 'blusher', 'foundation', 'highlighter', 'liquid', 'cream', 'powder', 'long', 'wear', 'longwear', 'serum', 'moisturiser', 'moisturizer', 'sunscreen', 'spf', 'face', 'the'}

def photo(page):
    m = re.search(r'(https://incidecoder-content\.storage\.googleapis\.com/[^"\s]+_front_photo_300x300@2x\.jpeg)', page) \
        or re.search(r'(https://incidecoder-content\.storage\.googleapis\.com/[^"\s]+_front_photo_original\.(?:jpe?g|png))', page)
    return m.group(1) if m else None

def main():
    out = json.load(open(OUT)) if os.path.exists(OUT) else {}
    retry = '--retry' in sys.argv
    todo = [p for p in catalog()['products'] if not any(s.get('image') for s in p['shades'])
            and (p['id'] not in out or (retry and not out[p['id']]))]
    print(len(todo), 'products to look up', file=sys.stderr)
    for p in todo:
        query = f"{p['brand']} {p['line']}"
        if retry:  # drop generic words that search ranks badly ("Matte Lipstick", "Blush")
            query = p['brand'] + ' ' + ' '.join(w for w in p['line'].split() if w.lower() not in GENERIC)
        try:
            hit = best_hit(query, get('/search?query=' + re.sub(r'\s+', '+', re.sub(r'[^\w\s]', ' ', query).strip())))
            if not hit or hit[0] < 0.3:
                out[p['id']] = None
                print('no match', query, file=sys.stderr)
                continue
            url = photo(get(hit[1]))
            out[p['id']] = {'image': url, 'page': 'https://incidecoder.com' + hit[1], 'matched': hit[2], 'confidence': round(hit[0], 2)} if url else None
            print(query, '->', hit[2], round(hit[0], 2), 'photo' if url else 'no photo', file=sys.stderr)
        except Exception as e:
            print('failed', query, e, file=sys.stderr)
        json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
