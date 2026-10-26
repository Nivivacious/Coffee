"""Pull lipstick, blush, foundation and highlighter shades from Purplle.

Reads the public category feeds and per-product shade lists that the
purplle.com site itself uses (only paths robots.txt allows), one request
at a time. Writes data/purplle-raw.json.

Each shade gets the retailer's own swatch hex when Purplle has one. When the
swatch is an image instead, we read its colour from the image (needs Pillow)
and mark it hexSource="image" so the engine trusts it a little less.

    python3 scripts/fetch_purplle.py            # full run, ~15 minutes
    python3 scripts/fetch_purplle.py --pages 2  # quick sample
"""
import argparse, io, json, os, re, sys, time, urllib.parse, urllib.request

BASE = 'https://www.purplle.com'
UA = 'Mozilla/5.0 (compatible; swmatch-catalog/1.0)'
FEEDS = {
    'makeup/lips/lipsticks': 'lipstick',
    'makeup/face/blush': 'blush',
    'makeup/face/foundation': 'foundation',
    'makeup/face/bronzers-highlighters': 'highlighter',
}
# Purplle's own category names mapped onto ours. Anything else is skipped.
CATEGORY = {
    'lipstick': 'lipstick', 'liquid lipstick': 'lipstick', 'lip crayon': 'lipstick', 'lipsticks': 'lipstick',
    'blush': 'blush', 'blusher': 'blush',
    'foundation': 'foundation',
    'highlighter': 'highlighter', 'highlighters': 'highlighter', 'illuminator': 'highlighter',
    'highlighter & illuminator': 'highlighter', 'highlighter and illuminator': 'highlighter',
}
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'purplle-raw.json')

def get(path, delay):
    time.sleep(delay)
    req = urllib.request.Request(path if path.startswith('http') else BASE + path, headers={'User-Agent': UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception as e:
            if attempt == 2: raise
            time.sleep(2 * (attempt + 1))

def walk_products(o, out):
    if isinstance(o, dict):
        if o.get('type') == 'product' and o.get('id'):
            out.append(o)
        for v in o.values(): walk_products(v, out)
    elif isinstance(o, list):
        for v in o: walk_products(v, out)

def image_colour(url, delay):
    """Median colour of the swatch, ignoring the light backdrop around it."""
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        im = Image.open(io.BytesIO(get(url, delay))).convert('RGB').resize((40, 40))
    except Exception:
        return None
    px = list(im.get_flattened_data()) if hasattr(im, 'get_flattened_data') else list(im.getdata())
    keep = [p for p in px if not (min(p) > 225) and not (max(p) - min(p) < 12 and min(p) > 180)]
    if len(keep) < 80: return None
    mid = lambda xs: sorted(xs)[len(xs) // 2]
    r, g, b = mid([p[0] for p in keep]), mid([p[1] for p in keep]), mid([p[2] for p in keep])
    return '#%02X%02X%02X' % (r, g, b)

def clean_shade(name):
    return re.sub(r'\s+', ' ', name or '').strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pages', type=int, default=12)
    ap.add_argument('--delay', type=float, default=0.6)
    ap.add_argument('--out', default=None, help='write here instead of data/purplle-raw.json')
    ap.add_argument('--skip', default=None, help='a raw file whose shades are already fetched')
    args = ap.parse_args()
    global OUT
    if args.out: OUT = args.out

    seen_products, families = set(), {}
    known = set()
    if args.skip:
        for fam in json.load(open(args.skip))['products']:
            for sh in fam['shades']: known.add(sh['url'].rsplit('/', 1)[-1])
    for feed, ours in FEEDS.items():
        empty = 0
        for page in range(1, args.pages + 1):
            q = urllib.parse.urlencode({'list_type': 'category', 'list_type_value': feed, 'page': page,
                                        'sort_by': 'rel', 'elite': 0, 'custom': '', 'mode_device': 'mobile'})
            try:
                items = []
                walk_products(json.loads(get('/neo/merch/listing?' + q, args.delay)), items)
            except Exception as e:
                print('feed failed', feed, page, e, file=sys.stderr); break
            if not items:
                # Page 1 of a feed is often rendered server-side and comes back empty here.
                empty += 1
                if empty >= 2: break
                continue
            empty = 0
            print(f'{feed} page {page}: {len(items)} products', file=sys.stderr)
            for it in items:
                pid = str(it['id'])
                if pid in seen_products: continue
                try:
                    v = json.loads(get(f'/neo/catalog/variants/{pid}', args.delay)).get('variants', {})
                except Exception as e:
                    print('variants failed', pid, e, file=sys.stderr); continue
                shades = (v.get('Shades') or v.get('Colors') or v.get('Colours') or {})
                rows = shades.get('items') or []
                if not rows:
                    seen_products.add(pid); continue
                for row in rows: seen_products.add(str(row.get('product_id')))
                if any(row.get('slug') in known for row in rows): continue
                w0 = rows[0].get('item_widget') or {}
                cat = CATEGORY.get(str(w0.get('category_name', '')).strip().lower())
                if not cat: continue
                fam_key = w0.get('variant_group_id') or pid
                fam = families.setdefault(fam_key, {
                    'brand': w0.get('brand_name'), 'category': cat, 'purplleCategory': w0.get('category_name'),
                    'names': [], 'shades': [],
                })
                for row in rows:
                    w = row.get('item_widget') or {}
                    hexcode = (row.get('hexcode') or '').strip()
                    src = 'retailer'
                    if not re.fullmatch(r'#?[0-9A-Fa-f]{6}', hexcode):
                        val = row.get('option_display_value') or ''
                        hexcode = image_colour(val, 0.1) if val.startswith('http') else None
                        src = 'image'
                    if not hexcode: continue
                    social = w.get('data_socialaction') or {}
                    fam['names'].append(row.get('product_name') or w.get('name') or '')
                    fam['shades'].append({
                        'name': clean_shade(row.get('option_display_name')),
                        'hex': ('#' + hexcode.lstrip('#')).upper(), 'hexSource': src,
                        'price': float(row.get('offer_price') or row.get('price') or 0),
                        'mrp': float(w.get('mrp') or row.get('price') or 0),
                        'rating': float(social.get('rating_avg') or 0),
                        'ratingCount': int(social.get('rating_count') or 0),
                        'inStock': str(row.get('stock_status')) == '0',
                        'url': f"{BASE}/product/{row.get('slug')}",
                    })
            save(families)
    save(families)

def save(families):
    out = [f for f in families.values() if f['shades']]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT + '.tmp', 'w', encoding='utf8') as fh:
        json.dump({'source': 'purplle.com', 'fetchedAt': time.strftime('%Y-%m-%d'), 'products': out}, fh, ensure_ascii=False, indent=1)
    os.replace(OUT + '.tmp', OUT)
    print(f'saved {len(out)} products, {sum(len(f["shades"]) for f in out)} shades', file=sys.stderr)

if __name__ == '__main__':
    main()
