import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch()
    for k,(w,h) in {'d':(1440,900),'m':(390,844)}.items():
        pg=b.new_page(viewport={'width':w,'height':h}); pg.goto('http://localhost:4173/'); pg.wait_for_timeout(1500)
        pg.evaluate("document.getElementById('alur').scrollIntoView()"); pg.wait_for_timeout(600)
        n=pg.evaluate("document.querySelectorAll('.step').length")
        for i in range(n):
            pg.evaluate(f"(()=>{{const e=document.querySelectorAll('.step')[{i}];const r=e.getBoundingClientRect();window.scrollBy(0,r.top+r.height/2-window.innerHeight*0.5)}})()")
            pg.wait_for_timeout(1100)
            pg.screenshot(path=f'shots/s{k}_{i+1:02d}.png')
        pg.close()
    b.close()
