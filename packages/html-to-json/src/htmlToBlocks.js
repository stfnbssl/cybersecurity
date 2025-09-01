"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToBlocks = htmlToBlocks;
// ------------------------------------------------------------
// src/htmlToBlocks.ts
// ------------------------------------------------------------
var crypto = require("node:crypto");
var jsdom_1 = require("jsdom");
var readability_1 = require("@mozilla/readability");
var cheerio_1 = require("cheerio");
function listItems($el, $) {
    var items = $el.children("li").map(function (_, li) { return $(li).text().trim(); }).get();
    return items.filter(Boolean);
}
function pushPlain(parts, b) {
    var _a;
    if (b.type === "heading" || b.type === "paragraph")
        parts.push(b.text);
    else if (b.type === "list")
        parts.push.apply(parts, b.items);
    else if (b.type === "table") {
        if ((_a = b.headers) === null || _a === void 0 ? void 0 : _a.length)
            parts.push.apply(parts, b.headers);
        for (var _i = 0, _b = b.rows; _i < _b.length; _i++) {
            var r = _b[_i];
            parts.push.apply(parts, r);
        }
    }
}
function htmlToBlocks(html, opts) {
    var _a;
    if (opts === void 0) { opts = {}; }
    var _b = opts.sourceUrl, sourceUrl = _b === void 0 ? null : _b, _c = opts.useReadability, useReadability = _c === void 0 ? false : _c, _d = opts.inferTableHeader, inferTableHeader = _d === void 0 ? true : _d;
    // optional Readability extraction to strip nav/ads
    if (useReadability) {
        try {
            var dom = new jsdom_1.JSDOM(html, { url: sourceUrl !== null && sourceUrl !== void 0 ? sourceUrl : undefined });
            var reader = new readability_1.Readability(dom.window.document);
            var article = reader.parse();
            if (article === null || article === void 0 ? void 0 : article.content)
                html = article.content;
            if (article === null || article === void 0 ? void 0 : article.title) {
                // prepend a synthetic <h1> to preserve title in blocks
                html = "<h1>".concat(article.title, "</h1>") + html;
            }
        }
        catch (_e) { }
    }
    var $ = cheerio_1.default.load(html);
    var $root = $("body").length ? $("body") : $(":root");
    var pageTitle = ($("title").first().text() || "").trim() || "Documento";
    var blocks = [];
    $root.find("*").each(function (_, el) {
        var tag = (el.tagName || "").toLowerCase();
        var $el = $(el);
        if (/^h[1-6]$/.test(tag)) {
            var level = parseInt(tag[1], 10);
            var text = $el.text().replace(/\s+/g, " ").trim();
            if (text)
                blocks.push({ type: "heading", level: level, text: text });
            return;
        }
        if (tag === "p") {
            var text = $el.text().replace(/\s+/g, " ").trim();
            if (text)
                blocks.push({ type: "paragraph", text: text });
            return;
        }
        if (tag === "ul" || tag === "ol") {
            var items = listItems($el, $);
            if (items.length)
                blocks.push({ type: "list", ordered: tag === "ol", items: items });
            return;
        }
        if (tag === "table") {
            var headers_1 = $el.find("th").map(function (_, th) { return $(th).text().replace(/\s+/g, " ").trim(); }).get();
            var hasHeaders_1 = headers_1.length > 0;
            var rows_1 = [];
            $el.find("tr").each(function (_, tr) {
                var cells = $(tr)
                    .children("td,th")
                    .map(function (_, c) { return $(c).text().replace(/\s+/g, " ").trim(); })
                    .get();
                if (!cells.length)
                    return;
                if (hasHeaders_1 && cells.join("\u0001") === headers_1.join("\u0001"))
                    return; // skip header row
                rows_1.push(cells);
            });
            // Infer headers if requested and none present but first row seems header-like (all non-empty)
            var finalHeaders_1 = headers_1;
            var dataRows = rows_1;
            if (!hasHeaders_1 && inferTableHeader && rows_1.length > 0 && rows_1[0].every(function (c) { return c.length > 0; })) {
                finalHeaders_1 = rows_1[0];
                dataRows = rows_1.slice(1);
                hasHeaders_1 = true;
            }
            var as_objects = hasHeaders_1
                ? dataRows.map(function (r) { return Object.fromEntries(finalHeaders_1.map(function (h, i) { var _a; return [h, (_a = r[i]) !== null && _a !== void 0 ? _a : ""]; })); })
                : [];
            blocks.push({
                type: "table",
                caption: $el.find("caption").first().text().trim() || undefined,
                headers: finalHeaders_1,
                rows: dataRows,
                as_objects: as_objects,
            });
            return;
        }
        // Optional extras (disabled by default): blockquote/pre/code/img can be added here
    });
    // Ensure we have at least one slide opener: if doc starts with no h1/h2, we can insert a leading heading
    var hasH12 = blocks.some(function (b) { return b.type === "heading" && (b.level === 1 || b.level === 2); });
    if (!hasH12) {
        blocks.unshift({ type: "heading", level: 1, text: pageTitle });
    }
    var plain = [];
    for (var _i = 0, blocks_1 = blocks; _i < blocks_1.length; _i++) {
        var b = blocks_1[_i];
        pushPlain(plain, b);
    }
    var plain_text = plain.join("\n");
    var content_hash = crypto.createHash("sha256").update(plain_text).digest("hex");
    var doc = {
        id: content_hash.slice(0, 16),
        source_url: (_a = opts.sourceUrl) !== null && _a !== void 0 ? _a : null,
        title: pageTitle,
        fetched_at: new Date().toISOString(),
        lang: null,
        blocks: blocks,
        tags: [],
        properties: {},
        plain_text: plain_text,
        embeddings: null,
    };
    return doc;
}
