const BASE_URL =
    window.location.protocol === 'http' ?
        'http://localhost:3993/api' :
        'https://chat.rahulnjs.com/api';

async function get(url) {
    const response = await fetch(`${BASE_URL}${url}`);
    return await response.json();
}

async function post(url, data) {
    const response = await fetch(`${BASE_URL}${url}`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return response.json();
}

async function put(url, data) {
    const response = await fetch(`${BASE_URL}${url}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return response.json();
}

export default {
    get, post, put
}