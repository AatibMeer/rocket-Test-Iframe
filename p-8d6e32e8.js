let e,t,n,l=!1,o=!1,s=!1,r=!1,i=!1;const c="undefined"!=typeof window?window:{},f=c.document||{head:{}},a={t:0,l:"",jmp:e=>e(),raf:e=>requestAnimationFrame(e),ael:(e,t,n,l)=>e.addEventListener(t,n,l),rel:(e,t,n,l)=>e.removeEventListener(t,n,l),ce:(e,t)=>new CustomEvent(e,t)},u=e=>Promise.resolve(e),d=(()=>{try{return new CSSStyleSheet,"function"==typeof(new CSSStyleSheet).replace}catch(e){}return!1})(),$=(e,t,n)=>{n&&n.map((([n,l,o])=>{const s=e,r=p(t,o),i=y(n);a.ael(s,l,r,i),(t.o=t.o||[]).push((()=>a.rel(s,l,r,i)))}))},p=(e,t)=>n=>{try{256&e.t?e.i[t](n):(e.u=e.u||[]).push([t,n])}catch(e){$e(e)}},y=e=>0!=(2&e),h="http://www.w3.org/1999/xlink",m=new WeakMap,w=e=>"sc-"+e.$,b={},g=e=>"object"==(e=typeof e)||"function"===e,v=(e,t,...n)=>{let l=null,o=null,s=null,r=!1,i=!1,c=[];const f=t=>{for(let n=0;n<t.length;n++)l=t[n],Array.isArray(l)?f(l):null!=l&&"boolean"!=typeof l&&((r="function"!=typeof e&&!g(l))&&(l+=""),r&&i?c[c.length-1].p+=l:c.push(r?k(null,l):l),i=r)};if(f(n),t){t.key&&(o=t.key),t.name&&(s=t.name);{const e=t.className||t.class;e&&(t.class="object"!=typeof e?e:Object.keys(e).filter((t=>e[t])).join(" "))}}if("function"==typeof e)return e(null===t?{}:t,c,S);const a=k(e,null);return a.h=t,c.length>0&&(a.m=c),a.g=o,a.v=s,a},k=(e,t)=>({t:0,k:e,p:t,j:null,m:null,h:null,g:null,v:null}),j={},S={forEach:(e,t)=>e.map(O).forEach(t),map:(e,t)=>e.map(O).map(t).map(C)},O=e=>({vattrs:e.h,vchildren:e.m,vkey:e.g,vname:e.v,vtag:e.k,vtext:e.p}),C=e=>{if("function"==typeof e.vtag){const t=Object.assign({},e.vattrs);return e.vkey&&(t.key=e.vkey),e.vname&&(t.name=e.vname),v(e.vtag,t,...e.vchildren||[])}const t=k(e.vtag,e.vtext);return t.h=e.vattrs,t.m=e.vchildren,t.g=e.vkey,t.v=e.vname,t},M=(e,t,n,l,o,s)=>{if(n!==l){let r=de(e,t),i=t.toLowerCase();if("class"===t){const t=e.classList,o=x(n),s=x(l);t.remove(...o.filter((e=>e&&!s.includes(e)))),t.add(...s.filter((e=>e&&!o.includes(e))))}else if("style"===t){for(const t in n)l&&null!=l[t]||(t.includes("-")?e.style.removeProperty(t):e.style[t]="");for(const t in l)n&&l[t]===n[t]||(t.includes("-")?e.style.setProperty(t,l[t]):e.style[t]=l[t])}else if("key"===t);else if("ref"===t)l&&l(e);else if(r||"o"!==t[0]||"n"!==t[1]){const c=g(l);if((r||c&&null!==l)&&!o)try{if(e.tagName.includes("-"))e[t]=l;else{let o=null==l?"":l;"list"===t?r=!1:null!=n&&e[t]==o||(e[t]=o)}}catch(e){}let f=!1;i!==(i=i.replace(/^xlink\:?/,""))&&(t=i,f=!0),null==l||!1===l?!1===l&&""!==e.getAttribute(t)||(f?e.removeAttributeNS(h,t):e.removeAttribute(t)):(!r||4&s||o)&&!c&&(l=!0===l?"":l,f?e.setAttributeNS(h,t,l):e.setAttribute(t,l))}else t="-"===t[2]?t.slice(3):de(c,i)?i.slice(2):i[2]+t.slice(3),n&&a.rel(e,t,n,!1),l&&a.ael(e,t,l,!1)}},R=/\s/,x=e=>e?e.split(R):[],L=(e,t,n,l)=>{const o=11===t.j.nodeType&&t.j.host?t.j.host:t.j,s=e&&e.h||b,r=t.h||b;for(l in s)l in r||M(o,l,s[l],void 0,n,t.t);for(l in r)M(o,l,s[l],r[l],n,t.t)},P=(o,i,c,a)=>{let u,d,$,p=i.m[c],y=0;if(l||(s=!0,"slot"===p.k&&(e&&a.classList.add(e+"-s"),p.t|=p.m?2:1)),null!==p.p)u=p.j=f.createTextNode(p.p);else if(1&p.t)u=p.j=f.createTextNode("");else{if(r||(r="svg"===p.k),u=p.j=f.createElementNS(r?"http://www.w3.org/2000/svg":"http://www.w3.org/1999/xhtml",2&p.t?"slot-fb":p.k),r&&"foreignObject"===p.k&&(r=!1),L(null,p,r),null!=e&&u["s-si"]!==e&&u.classList.add(u["s-si"]=e),p.m)for(y=0;y<p.m.length;++y)d=P(o,p,y,u),d&&u.appendChild(d);"svg"===p.k?r=!1:"foreignObject"===u.tagName&&(r=!0)}return u["s-hn"]=n,3&p.t&&(u["s-sr"]=!0,u["s-cr"]=t,u["s-sn"]=p.v||"",$=o&&o.m&&o.m[c],$&&$.k===p.k&&o.j&&T(o.j,!1)),u},T=(e,t)=>{a.t|=1;const l=e.childNodes;for(let e=l.length-1;e>=0;e--){const o=l[e];o["s-hn"]!==n&&o["s-ol"]&&(A(o).insertBefore(o,U(o)),o["s-ol"].remove(),o["s-ol"]=void 0,s=!0),t&&T(o,t)}a.t&=-2},E=(e,t,l,o,s,r)=>{let i,c=e["s-cr"]&&e["s-cr"].parentNode||e;for(c.shadowRoot&&c.tagName===n&&(c=c.shadowRoot);s<=r;++s)o[s]&&(i=P(null,l,s,e),i&&(o[s].j=i,c.insertBefore(i,U(t))))},W=(e,t,n,l,s)=>{for(;t<=n;++t)(l=e[t])&&(s=l.j,_(l),o=!0,s["s-ol"]?s["s-ol"].remove():T(s,!0),s.remove())},F=(e,t)=>e.k===t.k&&("slot"===e.k?e.v===t.v:e.g===t.g),U=e=>e&&e["s-ol"]||e,A=e=>(e["s-ol"]?e["s-ol"]:e).parentNode,D=(e,t)=>{const n=t.j=e.j,l=e.m,o=t.m,s=t.k,i=t.p;let c;null===i?(r="svg"===s||"foreignObject"!==s&&r,"slot"===s||L(e,t,r),null!==l&&null!==o?((e,t,n,l)=>{let o,s,r=0,i=0,c=0,f=0,a=t.length-1,u=t[0],d=t[a],$=l.length-1,p=l[0],y=l[$];for(;r<=a&&i<=$;)if(null==u)u=t[++r];else if(null==d)d=t[--a];else if(null==p)p=l[++i];else if(null==y)y=l[--$];else if(F(u,p))D(u,p),u=t[++r],p=l[++i];else if(F(d,y))D(d,y),d=t[--a],y=l[--$];else if(F(u,y))"slot"!==u.k&&"slot"!==y.k||T(u.j.parentNode,!1),D(u,y),e.insertBefore(u.j,d.j.nextSibling),u=t[++r],y=l[--$];else if(F(d,p))"slot"!==u.k&&"slot"!==y.k||T(d.j.parentNode,!1),D(d,p),e.insertBefore(d.j,u.j),d=t[--a],p=l[++i];else{for(c=-1,f=r;f<=a;++f)if(t[f]&&null!==t[f].g&&t[f].g===p.g){c=f;break}c>=0?(s=t[c],s.k!==p.k?o=P(t&&t[i],n,c,e):(D(s,p),t[c]=void 0,o=s.j),p=l[++i]):(o=P(t&&t[i],n,i,e),p=l[++i]),o&&A(u.j).insertBefore(o,U(u.j))}r>a?E(e,null==l[$+1]?null:l[$+1].j,n,l,i,$):i>$&&W(t,r,a)})(n,l,t,o):null!==o?(null!==e.p&&(n.textContent=""),E(n,null,t,o,0,o.length-1)):null!==l&&W(l,0,l.length-1),r&&"svg"===s&&(r=!1)):(c=n["s-cr"])?c.parentNode.textContent=i:e.p!==i&&(n.data=i)},H=e=>{let t,n,l,o,s,r,i=e.childNodes;for(n=0,l=i.length;n<l;n++)if(t=i[n],1===t.nodeType){if(t["s-sr"])for(s=t["s-sn"],t.hidden=!1,o=0;o<l;o++)if(r=i[o].nodeType,i[o]["s-hn"]!==t["s-hn"]||""!==s){if(1===r&&s===i[o].getAttribute("slot")){t.hidden=!0;break}}else if(1===r||3===r&&""!==i[o].textContent.trim()){t.hidden=!0;break}H(t)}},N=[],q=e=>{let t,n,l,s,r,i,c=0,f=e.childNodes,a=f.length;for(;c<a;c++){if(t=f[c],t["s-sr"]&&(n=t["s-cr"])&&n.parentNode)for(l=n.parentNode.childNodes,s=t["s-sn"],i=l.length-1;i>=0;i--)n=l[i],n["s-cn"]||n["s-nr"]||n["s-hn"]===t["s-hn"]||(V(n,s)?(r=N.find((e=>e.S===n)),o=!0,n["s-sn"]=n["s-sn"]||s,r?r.O=t:N.push({O:t,S:n}),n["s-sr"]&&N.map((e=>{V(e.S,n["s-sn"])&&(r=N.find((e=>e.S===n)),r&&!e.O&&(e.O=r.O))}))):N.some((e=>e.S===n))||N.push({S:n}));1===t.nodeType&&q(t)}},V=(e,t)=>1===e.nodeType?null===e.getAttribute("slot")&&""===t||e.getAttribute("slot")===t:e["s-sn"]===t||""===t,_=e=>{e.h&&e.h.ref&&e.h.ref(null),e.m&&e.m.map(_)},z=e=>fe(e).C,B=(e,t,n)=>{const l=z(e);return{emit:e=>G(l,t,{bubbles:!!(4&n),composed:!!(2&n),cancelable:!!(1&n),detail:e})}},G=(e,t,n)=>{const l=a.ce(t,n);return e.dispatchEvent(l),l},I=(e,t)=>{t&&!e.M&&t["s-p"]&&t["s-p"].push(new Promise((t=>e.M=t)))},J=(e,t)=>{if(e.t|=16,!(4&e.t))return I(e,e.R),je((()=>K(e,t)));e.t|=512},K=(e,t)=>{const n=e.i;let l;return t&&(e.t|=256,e.u&&(e.u.map((([e,t])=>ee(n,e,t))),e.u=null),l=ee(n,"componentWillLoad")),l=te(l,(()=>ee(n,"componentWillRender"))),te(l,(()=>Q(e,n,t)))},Q=async(e,t,n)=>{const l=e.C,o=l["s-rc"];n&&(e=>{const t=e.L,n=e.C,l=t.t,o=((e,t)=>{let n=w(t),l=he.get(n);if(e=11===e.nodeType?e:f,l)if("string"==typeof l){let t,o=m.get(e=e.head||e);o||m.set(e,o=new Set),o.has(n)||(t=f.createElement("style"),t.innerHTML=l,e.insertBefore(t,e.querySelector("link")),o&&o.add(n))}else e.adoptedStyleSheets.includes(l)||(e.adoptedStyleSheets=[...e.adoptedStyleSheets,l]);return n})(n.shadowRoot?n.shadowRoot:n.getRootNode(),t);10&l&&(n["s-sc"]=o,n.classList.add(o+"-h"))})(e),X(e,t),o&&(o.map((e=>e())),l["s-rc"]=void 0);{const t=l["s-p"],n=()=>Y(e);0===t.length?n():(Promise.all(t).then(n),e.t|=4,t.length=0)}},X=(r,i)=>{try{i=i.render(),r.t&=-17,r.t|=2,((r,i)=>{const c=r.C,u=r.L,d=r.P||k(null,null),$=(e=>e&&e.k===j)(i)?i:v(null,null,i);if(n=c.tagName,u.T&&($.h=$.h||{},u.T.map((([e,t])=>$.h[t]=c[e]))),$.k=null,$.t|=4,r.P=$,$.j=d.j=c.shadowRoot||c,e=c["s-sc"],t=c["s-cr"],l=0!=(1&u.t),o=!1,D(d,$),a.t|=1,s){let e,t,n,l,o,s;q($.j);let r=0;for(;r<N.length;r++)e=N[r],t=e.S,t["s-ol"]||(n=f.createTextNode(""),n["s-nr"]=t,t.parentNode.insertBefore(t["s-ol"]=n,t));for(r=0;r<N.length;r++)if(e=N[r],t=e.S,e.O){for(l=e.O.parentNode,o=e.O.nextSibling,n=t["s-ol"];n=n.previousSibling;)if(s=n["s-nr"],s&&s["s-sn"]===t["s-sn"]&&l===s.parentNode&&(s=s.nextSibling,!s||!s["s-nr"])){o=s;break}(!o&&l!==t.parentNode||t.nextSibling!==o)&&t!==o&&(!t["s-hn"]&&t["s-ol"]&&(t["s-hn"]=t["s-ol"].parentNode.nodeName),l.insertBefore(t,o))}else 1===t.nodeType&&(t.hidden=!0)}o&&H($.j),a.t&=-2,N.length=0})(r,i)}catch(e){$e(e,r.C)}return null},Y=e=>{const t=e.C,n=e.i,l=e.R;ee(n,"componentDidRender"),64&e.t||(e.t|=64,ne(t),ee(n,"componentDidLoad"),e.W(t),l||Z()),e.F(t),e.M&&(e.M(),e.M=void 0),512&e.t&&ke((()=>J(e,!1))),e.t&=-517},Z=()=>{ne(f.documentElement),ke((()=>G(c,"appload",{detail:{namespace:"rocket-lawyer-web-components"}})))},ee=(e,t,n)=>{if(e&&e[t])try{return e[t](n)}catch(e){$e(e)}},te=(e,t)=>e&&e.then?e.then(t):t(),ne=e=>e.classList.add("hydrated"),le=(e,t,n)=>{if(t.U){e.watchers&&(t.A=e.watchers);const l=Object.entries(t.U),o=e.prototype;if(l.map((([e,[l]])=>{31&l||2&n&&32&l?Object.defineProperty(o,e,{get(){return((e,t)=>fe(this).D.get(t))(0,e)},set(n){((e,t,n,l)=>{const o=fe(this),s=o.C,r=o.D.get(t),i=o.t,c=o.i;if(n=((e,t)=>null==e||g(e)?e:4&t?"false"!==e&&(""===e||!!e):2&t?parseFloat(e):1&t?e+"":e)(n,l.U[t][0]),!(8&i&&void 0!==r||n===r)&&(o.D.set(t,n),c)){if(l.A&&128&i){const e=l.A[t];e&&e.map((e=>{try{c[e](n,r,t)}catch(e){$e(e,s)}}))}if(2==(18&i)){if(c.componentShouldUpdate&&!1===c.componentShouldUpdate(n,r,t))return;J(o,!1)}}})(0,e,n,t)},configurable:!0,enumerable:!0}):1&n&&64&l&&Object.defineProperty(o,e,{value(...t){const n=fe(this);return n.H.then((()=>n.i[e](...t)))}})})),1&n){const n=new Map;o.attributeChangedCallback=function(e,t,l){a.jmp((()=>{const t=n.get(e);this[t]=(null!==l||"boolean"!=typeof this[t])&&l}))},e.observedAttributes=l.filter((([e,t])=>15&t[0])).map((([e,l])=>{const o=l[1]||e;return n.set(o,e),512&l[0]&&t.T.push([e,o]),o}))}}return e},oe=e=>{ee(e,"connectedCallback")},se=(e,t={})=>{const n=[],l=t.exclude||[],o=c.customElements,s=f.head,r=s.querySelector("meta[charset]"),i=f.createElement("style"),u=[];let p,y=!0;Object.assign(a,t),a.l=new URL(t.resourcesUrl||"./",f.baseURI).href,e.map((e=>e[1].map((t=>{const s={t:t[0],$:t[1],U:t[2],N:t[3]};s.U=t[2],s.N=t[3],s.T=[],s.A={};const r=s.$,i=class extends HTMLElement{constructor(e){super(e),ue(e=this,s),1&s.t&&e.attachShadow({mode:"open"})}connectedCallback(){p&&(clearTimeout(p),p=null),y?u.push(this):a.jmp((()=>(e=>{if(0==(1&a.t)){const t=fe(e),n=t.L,l=()=>{};if(1&t.t)$(e,t,n.N),oe(t.i);else{t.t|=1,12&n.t&&(e=>{const t=e["s-cr"]=f.createComment("");t["s-cn"]=!0,e.insertBefore(t,e.firstChild)})(e);{let n=e;for(;n=n.parentNode||n.host;)if(n["s-p"]){I(t,t.R=n);break}}n.U&&Object.entries(n.U).map((([t,[n]])=>{if(31&n&&e.hasOwnProperty(t)){const n=e[t];delete e[t],e[t]=n}})),(async(e,t,n,l,o)=>{if(0==(32&t.t)){{if(t.t|=32,(o=ye(n)).then){const e=()=>{};o=await o,e()}o.isProxied||(n.A=o.watchers,le(o,n,2),o.isProxied=!0);const e=()=>{};t.t|=8;try{new o(t)}catch(e){$e(e)}t.t&=-9,t.t|=128,e(),oe(t.i)}if(o.style){let e=o.style;const t=w(n);if(!he.has(t)){const l=()=>{};((e,t,n)=>{let l=he.get(e);d&&n?(l=l||new CSSStyleSheet,l.replace(t)):l=t,he.set(e,l)})(t,e,!!(1&n.t)),l()}}}const s=t.R,r=()=>J(t,!0);s&&s["s-rc"]?s["s-rc"].push(r):r()})(0,t,n)}l()}})(this)))}disconnectedCallback(){a.jmp((()=>(()=>{if(0==(1&a.t)){const e=fe(this),t=e.i;e.o&&(e.o.map((e=>e())),e.o=void 0),ee(t,"disconnectedCallback")}})()))}componentOnReady(){return fe(this).q}};s.V=e[0],l.includes(r)||o.get(r)||(n.push(r),o.define(r,le(i,s,1)))})))),i.innerHTML=n+"{visibility:hidden}.hydrated{visibility:inherit}",i.setAttribute("data-styles",""),s.insertBefore(i,r?r.nextSibling:s.firstChild),y=!1,u.length?u.map((e=>e.connectedCallback())):a.jmp((()=>p=setTimeout(Z,30)))},re=e=>{const t=new URL(e,a.l);return t.origin!==c.location.origin?t.href:t.pathname},ie=(e,t)=>t,ce=new WeakMap,fe=e=>ce.get(e),ae=(e,t)=>ce.set(t.i=e,t),ue=(e,t)=>{const n={t:0,C:e,L:t,D:new Map};return n.H=new Promise((e=>n.F=e)),n.q=new Promise((e=>n.W=e)),e["s-p"]=[],e["s-rc"]=[],$(e,n,t.N),ce.set(e,n)},de=(e,t)=>t in e,$e=(e,t)=>(0,console.error)(e,t),pe=new Map,ye=e=>{const t=e.$.replace(/-/g,"_"),n=e.V,l=pe.get(n);return l?l[t]:import(`./${n}.entry.js`).then((e=>(pe.set(n,e),e[t])),$e)},he=new Map,me=[],we=[],be=(e,t)=>n=>{e.push(n),i||(i=!0,t&&4&a.t?ke(ve):a.raf(ve))},ge=e=>{for(let t=0;t<e.length;t++)try{e[t](performance.now())}catch(e){$e(e)}e.length=0},ve=()=>{ge(me),ge(we),(i=me.length>0)&&a.raf(ve)},ke=e=>u().then(e),je=be(we,!0);export{ie as F,j as H,re as a,se as b,B as c,z as g,v as h,u as p,ae as r};