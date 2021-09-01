import fetch from 'node-fetch';
import AbortController from 'abort-controller';

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
