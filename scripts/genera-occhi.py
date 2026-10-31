"""Crea le versioni dei vermetti senza pupille (assets/mascotte/occhi/*.svg).
Le pupille le disegna js/ui/occhi.js sopra, così seguono il dito. Si lancia una volta: python scripts/genera-occhi.py"""
import os
import re

CARTELLA = os.path.join(os.path.dirname(__file__), '..', 'assets', 'mascotte')
USCITA = os.path.join(CARTELLA, 'occhi')
os.makedirs(USCITA, exist_ok=True)

for nome in ['rosso', 'rossella', 'rossella-pensa']:
    s = open(os.path.join(CARTELLA, nome + '.svg'), encoding='utf-8').read()
    # pupilla (scura, r 5.5 o 4.5) e riflesso (bianco, r 2) subito dopo
    nuovo, n = re.subn(r'<circle cx="[\d.]+" cy="[\d.]+" r="(?:5\.5|4\.5)" fill="#4a2a22"/><circle cx="[\d.]+" cy="[\d.]+" r="2" fill="#fff"/>', '', s)
    assert n == 2, (nome, n)
    open(os.path.join(USCITA, nome + '.svg'), 'w', encoding='utf-8', newline='\n').write(nuovo)
    print(nome, 'ok')
