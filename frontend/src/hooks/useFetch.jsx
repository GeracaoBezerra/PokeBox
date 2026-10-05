function useFetch(url) {

    async function getData(endpoint) {
        const response = await fetch(url + endpoint);

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }

        return await response.json();
    }

    async function postData(endpoint, body) {
        const response = await fetch(url + endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }

        return await response.json();
    }

    async function patchData(endpoint, body) {
        const response = await fetch(url + endpoint, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }

        return await response.json();
    }

    async function deleteData(endpoint) {
        const response = await fetch(url + endpoint, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }

        if (response.status === 204) {
            return;
        }

        return await response.json();
    }

    return {
        getData,
        postData,
        patchData,
        deleteData
    };
}

export default useFetch;