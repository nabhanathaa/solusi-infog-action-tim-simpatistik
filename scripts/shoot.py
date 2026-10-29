import sys, json
from playwright.sync_api import sync_playwright
BASE='http://localhost:4173/'
routes=sys.argv[1].split(',') if len(sys.argv)>1 else ['','#/peta','#/peta?w=3273','#/kompas?r=pemda','#/kompas?r=pencari&w=3273','#/kompas?r=pelatihan','#/simulator?w=3273','#/radar','#/suara','#/metode']
sizes={'d':(1440,900),'m':(390,844)}
only=sys.argv[2] if len(sys.argv)>2 else 'dm'
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for k in only:
        w,h=sizes[k]
        ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=(k=='m'),has_touch=(k=='m'))
        pg=ctx.new_page()
        pg.on('console',lambda m: errs.append((k,m.type,m.text)) if m.type in('error','warning') else None)
        pg.on('pageerror',lambda e: errs.append((k,'pageerror',str(e))))
        for r in routes:
            name=(r.replace('#/','').replace('?','_').replace('&','_').replace('=','') or 'home')
            pg.goto(BASE+r); pg.wait_for_timeout(1800)
            pg.screenshot(path=f'shots/{k}_{name}.png',full_page=(name!='home' and not name.startswith('peta')))
        ctx.close()
    b.close()
print(json.dumps(errs,indent=1))
