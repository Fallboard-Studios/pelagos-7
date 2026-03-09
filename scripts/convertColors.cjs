const fs = require('fs');
const path = './src/constants/colorTheme.json';
const hexToHsl = hex => {
    hex = hex.replace('#','');
    let r = parseInt(hex.substr(0,2),16)/255;
    let g = parseInt(hex.substr(2,2),16)/255;
    let b = parseInt(hex.substr(4,2),16)/255;
    let max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if(max===min){h=s=0;} else {
        let d = max-min;
        s = l>0.5? d/(2-max-min) : d/(max+min);
        switch(max){
            case r: h = (g-b)/d + (g<b?6:0); break;
            case g: h = (b-r)/d + 2; break;
            case b: h = (r-g)/d + 4; break;
        }
        h /= 6;
    }
    return {h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100)};
};

let obj = JSON.parse(fs.readFileSync(path, 'utf8'));

function convert(o) {
    if(typeof o==='string' && o.startsWith('#')) return hexToHsl(o);
    if(Array.isArray(o)) return o.map(convert);
    if(o && typeof o==='object') {
        let r={};
        for(let k in o) r[k]=convert(o[k]);
        return r;
    }
    return o;
}

let out = convert(obj);
// add comment by writing manually
let text = JSON.stringify(out, null, 2);
text = '// All colors in HSL format (h: 0-360, s: 0-100, l: 0-100)\n' + text;
fs.writeFileSync(path, text, 'utf8');
console.log('Converted colorTheme.json to HSL');
