import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.Node = dom.window.Node;
globalThis.DOMParser = dom.window.DOMParser;

const { Editor } = await import('@tiptap/core');
const StarterKit = (await import('@tiptap/starter-kit')).default;
const { Paragraph } = await import('@tiptap/extension-paragraph');
const { TextStyle } = await import('@tiptap/extension-text-style');
const { Underline } = await import('@tiptap/extension-underline');
const { Color } = await import('@tiptap/extension-color');
const { Markdown } = await import('tiptap-markdown');

const editor = new Editor({
  extensions: [
    StarterKit.configure({ paragraph: false }),
    Paragraph,
    TextStyle,
    Underline,
    Color,
    Markdown.configure({ html: true, linkify: true, breaks: true }),
  ],
  content: '<p>안녕 <u>상명초등학교</u>에 근무하는 <strong>김승현</strong> 입니다.</p>',
});

const md = editor.storage.markdown.getMarkdown();
console.log('MARKDOWN OUTPUT:\n' + JSON.stringify(md));
