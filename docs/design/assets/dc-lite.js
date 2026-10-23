/* dc-lite: يشغّل شاشات يوزرسيف المصدّرة كصفحات HTML مستقلة (React 18) */
(function () {
  var h = React.createElement;
  var ATTR = { 'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength', inputmode: 'inputMode',
    autocomplete: 'autoComplete', autocapitalize: 'autoCapitalize', novalidate: 'noValidate', colspan: 'colSpan', rowspan: 'rowSpan', datetime: 'dateTime',
    crossorigin: 'crossOrigin', srcset: 'srcSet', viewbox: 'viewBox', enctype: 'encType', spellcheck: 'spellCheck', autofocus: 'autoFocus', contenteditable: 'contentEditable' };
  var EVENTS = { onclick: 'onClick', onchange: 'onChange', oninput: 'onInput', onsubmit: 'onSubmit', onkeydown: 'onKeyDown', onkeyup: 'onKeyUp', onfocus: 'onFocus', onblur: 'onBlur',
    onmouseenter: 'onMouseEnter', onmouseleave: 'onMouseLeave', onmousemove: 'onMouseMove', onpointermove: 'onPointerMove', onpointerleave: 'onPointerLeave', ondragover: 'onDragOver', ondrop: 'onDrop', ontoggle: 'onToggle' };
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g, WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, scope) {
    if (path === 'true') return true; if (path === 'false') return false; if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    var m = str.match(WHOLE); if (m) return lookup(m[1], scope);
    return str.replace(HOLE, function (_, p) { var v = lookup(p, scope); return v == null || v === false ? '' : String(v); });
  }
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
  function parseStyle(str) {
    var out = {}, buf = '', depth = 0, parts = [];
    for (var i = 0; i < str.length; i++) { var c = str[i]; if (c === '(') depth++; if (c === ')') depth--; if (c === ';' && depth === 0) { parts.push(buf); buf = ''; } else buf += c; }
    parts.push(buf);
    parts.forEach(function (p) {
      var k = p.indexOf(':'); if (k < 0) return;
      var name = p.slice(0, k).trim(), val = p.slice(k + 1).trim(); if (!name) return;
      var imp = /!important\s*$/.test(val); if (imp) val = val.replace(/\s*!important\s*$/, '');
      if (name.indexOf('--') === 0) out[name] = val;
      else { if (name.indexOf('-webkit-') === 0) name = 'Webkit' + camel(name.slice(7)); else name = camel(name); out[name] = val; }
    });
    return out;
  }
  function propsOf(el, scope, inSvg) {
    var p = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i], n = a.name, raw = a.value;
      if (n.indexOf('hint-') === 0) continue;
      var v = raw.indexOf('{{') >= 0 ? interp(raw, scope) : raw;
      var ln = n.toLowerCase();
      if (EVENTS[ln]) { if (typeof v === 'function') p[EVENTS[ln]] = v; continue; }
      if (ln === 'style') { p.style = typeof v === 'string' ? parseStyle(v) : v; continue; }
      if (ln === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
        if (el.type === 'checkbox' || el.type === 'radio') { p.value = v; continue; }
        p.value = v == null ? '' : v; continue;
      }
      if (ln === 'checked') { p.checked = v === '' ? true : !!v && v !== 'false'; continue; }
      if (ln === 'disabled' || ln === 'multiple' || ln === 'novalidate' || ln === 'required' || ln === 'open' || ln === 'hidden' || ln === 'selected' || ln === 'readonly') {
        var b = v === '' ? true : (v === 'false' ? false : !!v); p[ATTR[ln] || ln] = b; continue;
      }
      if (ln.indexOf('aria-') === 0 || ln.indexOf('data-') === 0 || ln === 'role') { p[ln] = v == null ? undefined : String(v); continue; }
      if (ATTR[ln]) { p[ATTR[ln]] = v; continue; }
      if (inSvg && n.indexOf('-') > 0) { p[camel(n)] = v; continue; }
      p[n] = v;
    }
    if (p.value !== undefined && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') && !p.onChange) { p.defaultValue = p.value; delete p.value; }
    if (p.checked !== undefined && !p.onChange) { p.defaultChecked = p.checked; delete p.checked; }
    if (el.tagName === 'DETAILS' && p.open !== undefined) { /* keep */ }
    return p;
  }
  function kids(node, scope, inSvg) {
    var out = [];
    node.childNodes.forEach(function (c, i) {
      var r = render(c, scope, inSvg, i);
      if (r == null || r === '') return;
      if (Array.isArray(r)) r.forEach(function (x) { out.push(x); }); else out.push(r);
    });
    return out;
  }
  function render(node, scope, inSvg, key) {
    if (node.nodeType === 3) { var t = node.nodeValue; return t.indexOf('{{') >= 0 ? (function () { var v = interp(t, scope); return v == null || v === false || v === true ? '' : String(v); })() : t; }
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (tag === 'helmet') return null;
    if (tag === 'sc-if') { return lookup((node.getAttribute('value') || '').replace(/^\s*\{\{\s*|\s*\}\}\s*$/g, ''), scope) ? h(React.Fragment, { key: key }, kids(node, scope, inSvg)) : null; }
    if (tag === 'sc-for') {
      var list = lookup((node.getAttribute('list') || '').replace(/^\s*\{\{\s*|\s*\}\}\s*$/g, ''), scope) || [], as = node.getAttribute('as') || 'item';
      return h(React.Fragment, { key: key }, list.map(function (item, idx) { var s = Object.create(scope); s[as] = item; s.$index = idx; return h(React.Fragment, { key: idx }, kids(node, s, inSvg)); }));
    }
    var svg = inSvg || tag === 'svg';
    var p = propsOf(node, scope, svg); p.key = key;
    var name = svg ? node.tagName : tag;
    if (tag === 'textarea') { if (p.value === undefined && p.defaultValue === undefined) p.defaultValue = node.textContent; return h('textarea', p); }
    if (VOID[tag]) return h(name, p);
    var c = kids(tag === 'template' ? node.content : node, scope, svg);
    return h(name, p, c.length ? c : undefined);
  }

  window.DCLogic = class extends React.Component {
    constructor(props) { super(props); this.state = this.state || {}; }
    render() { return h(React.Fragment, null, kids(window.__dcTemplate, this.renderVals() || {}, false)); }
  };

  function boot() {
    var tpl = document.getElementById('dc-template');
    var frag = tpl.content;
    var root = frag.querySelector('x-dc') || frag;
    var helmet = root.querySelector('helmet');
    if (helmet) Array.prototype.slice.call(helmet.children).forEach(function (el) { document.head.appendChild(el.cloneNode(true)); });
    window.__dcTemplate = root;
    var s = document.querySelector('script[data-dc-script]');
    var props = {};
    try { var dp = JSON.parse(s.getAttribute('data-props') || '{}'); Object.keys(dp).forEach(function (k) { if (k.charAt(0) !== '$' && dp[k] && 'default' in dp[k]) props[k] = dp[k]['default']; }); } catch (e) {}
    var Comp = new Function('DCLogic', s.textContent + '\nreturn Component;')(window.DCLogic);
    ReactDOM.createRoot(document.getElementById('dc-root')).render(h(Comp, props));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
