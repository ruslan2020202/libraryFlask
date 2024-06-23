const apiBase = 'http://127.0.0.1:5000';

async function fetchBooks() {
  const response = await fetch(`${apiBase}/api/books`);
  return response.json();
}

async function fetchBook(id) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBase}/api/book/${id}`, {
    headers: {
        'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

async function fetchImage(id){
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBase}/api/picture/${id}`,{
        headers:{
            'Authorization': `Bearer ${token}`
        }
    })
    console.log(response);
    return response
}

async function addBook(bookData) {
    const token = localStorage.getItem('token'); // Получаем токен из localStorage
    if (!token) {
        throw new Error('Отсутствует токен авторизации');
    }

    const response = await fetch(`${apiBase}/api/books`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: bookData
    });

    return response.json(); // Возвращаем данные, полученные от сервера
}


async function updateBook(id, bookData) {
    const token = localStorage.getItem('token'); // Получаем токен из localStorage
  const response = await fetch(`${apiBase}/api/book/${id}`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    method: 'PUT',
    body: JSON.stringify(bookData),
  });
  return response.json();
}

async function deleteBook(id) {
  const response = await fetch(`${apiBase}/books/${id}`, {
    method: 'DELETE'
  });
  return response.json();
}

async function fetchReview(id) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBase}/api/review/${id}`, {
    headers: {
        'Authorization': `Bearer ${token}`,
    }
  });
  console.log(response);
  return response.json();
}

async function fetchReviews(id) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBase}/api/reviews/${id}`, {
        headers:{
            'Authorization': `Bearer ${token}`,
        }
    })
    return response.json()
}

async function addReview(values) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiBase}/api/review/${values.get("bookId")}`, {
            method: 'POST',
            body: JSON.stringify({
                rating: parseInt(values.get("rating")),
                comment: values.get("text"),
            }),
            headers: {
                'Content-Type': "application/json",
                'Authorization': `Bearer ${token}`,
            }
        });
        const data = await response.json();

        console.log(response);

        return response;
}

async function loginAuth(credentials) {
    try {
        const response = await fetch(`${apiBase}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
          });
          const data = await response.json();
          localStorage.setItem('token', data.token); // Сохраняем токен в localStorage
          return response
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
    throw error; // выбросить ошибку для дальнейшей обработки
    }
}

async function getCurrentUser() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Отсутствует токен авторизации');
            return {}; // Возвращаем пустые данные
        }

        const response = await fetch(`${apiBase}/api/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`Ошибка HTTP: ${response.status}`);
            return {}; // Возвращаем пустые данные
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении данных о пользователе:', error.message);
        return {}; // Возвращаем пустые данные
    }
}

async function getGanre(){
    try {
        const response = await fetch(`${apiBase}/api/genres`);
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        const data = await response.json();
        displayGenres(data);
        return data
    } catch (error) {
        console.error('Ошибка при получении списка жанров:', error.message);
    }
}

function displayGenres(genres) {
    const genresSelect = document.getElementById('genres'); // Элемент <select> для выбора жанров
    if (!genresSelect) return;

    genresSelect.innerHTML = ''; // Очищаем содержимое элемента

    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre.id; // Предполагается, что в данных есть поле "id" для каждого жанра
        option.textContent = genre.name; // Предполагается, что в данных есть поле "name" для каждого жанра
        genresSelect.appendChild(option);
    });
}

async function deleteBook(id) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBase}/api/book/${id}`, {
        method: "DELETE",
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    return response.json()
}

async function deleteReview(id){
        const token = localStorage.getItem('token');
    const response = await fetch(`${apiBase}/api/reviews/${id}`, {
        method: "DELETE",
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    return response.json()
}


async function getAllReviews(id){
    const data = await fetch(`${apiBase}/api/all_reviews/${id}`)
    return data.json()
}

