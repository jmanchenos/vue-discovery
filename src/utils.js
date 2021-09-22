import fetch from 'node-fetch';
import AbortController from 'abort-controller';
import { MarkdownString } from 'vscode';

export const generateHtml = (url, name) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detalle del componente ${name}</title>
    <style type="text/css">
        html, body, div, iframe { margin: 0; padding: 0; height: 100%; }
        iframe { display: block; width: 100%; border: none; }
    </style>
</head>
<body>
    <iframe src="${url}">
</body>
</html>
 `;
};

export const fetchWithTimeout = (url, options = {}, ms = 3000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, ms);
    return fetch(url, {
        signal: controller.signal,
        ...options,
    })
        .then(response => response)
        .catch(err => console.log(`${err.name === 'Abort' ? 'Timeout error' : err.message}`))
        .finally(() => {
            clearTimeout(timeout);
        });
};

export const getMarkdownData = obj => {
    const { type, initialValue } = obj;
    let text = initialValue;
    if (type === 'object') {
        try {
            text =
                Object.entries(JSON.parse(initialValue)).reduce(
                    (prev, x) => prev + '\r\n' + x[0] + ': ' + x[1]['value'],
                    '{'
                ) + '}';
        } catch (err) {}
    }
    return new MarkdownString('`valor inicial', true).appendCodeblock(`${type} : ${text} `, 'javascript');
};

export const getMarkdownComputed = obj => {
    return new MarkdownString('', true).appendCodeblock(`type: ${obj.type}`, 'javascript');
};

export const getMarkdownProps = obj => {
    const { name, required, type, default: def } = obj;
    return new MarkdownString('', true).appendCodeblock(
        ` ${name}: {
        \t type: ${type},
        \t required: ${required}${def ? ',\r\n\t default: ' + def + '\r\n}' : '\r\n}'}
    `,
        'javascript'
    );
};

export const getMarkdownMethods = obj => {
    const { description, syntax } = obj;
    return new MarkdownString(`${description ? description + '\r\n' : ''}`, true).appendCodeblock(syntax, 'javascript');
};
