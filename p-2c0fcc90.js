function n(n){var o;return"function"==typeof(null===(o=n.checkValidity)||void 0===o?void 0:o.call)}function o(n,o){var i,t;const r="function"==typeof(null===(t=null===(i=n)||void 0===i?void 0:i.getValue)||void 0===t?void 0:t.call);return o?r&&!!n.name:r}async function i(n){var t,r,u;if(o(n))return n.getValue();if(function(n){var o,i;return("radio"===(null===(o=n)||void 0===o?void 0:o.type)||"checkbox"===(null===(i=n)||void 0===i?void 0:i.type))&&n instanceof HTMLInputElement}(n))return n.checked?null!==(t=n.value)&&void 0!==t?t:"on":"";if("value"in n)return n.value||"";if(null===(r=n)||void 0===r?void 0:r.children){const o=Promise.resolve(void 0);for(let t=0;t<n.children.length;t+=1)o.then((o=>void 0===o?i(n.children.item(t)):o));const t=await o;if(void 0!==t)return t}return(null===(u=n)||void 0===u?void 0:u.shadowRoot)?i(n.shadowRoot):void 0}async function t(n){return await i(n)||""}export{n as a,t as g,o as h};