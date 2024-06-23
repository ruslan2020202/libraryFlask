document.addEventListener('DOMContentLoaded', async function () {
    await getGanre(); // Вызываем функцию загрузки жанров при загрузке страницы
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', async function (event) {
            event.preventDefault();
            const login = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const result = await loginAuth({login, password});
            if (result.status === 200) {
                location.href = 'index.html';

            } else {
                document.getElementById('errorMessage').textContent = 'Невозможно аутентифицироваться с указанными логином и паролем';
            }
        });
    }


    try {
        const role = await getCurrentUser(); // Получаем роль текущего пользователя
        if (role.role === 'admin') {
            // Если роль администратор, показываем форму добавления книги и добавляем обработчик события
            const addBookForm = document.getElementById('addBookForm');
            if (addBookForm) {
                addBookForm.style.display = 'block'; // Показываем форму
                addBookForm.addEventListener('submit', async function (event) {
                    event.preventDefault();
                    const formData = new FormData(this);
                    try {
                        const result = await addBook(formData);
                        location.href = 'index.html';
                    } catch (error) {
                        console.error('Ошибка при добавлении книги:', error.message);
                    }
                });
            }
        } else {
            // Если роль не администратор, скрываем форму добавления книги
            let btnAddBokk = document.getElementById('addBookButton')
            btnAddBokk.remove()
        }
    } catch (error) {
        console.error('Ошибка при определении роли пользователя:', error.message);
        // Обработка ошибки при получении роли пользователя
    }


    if (document.getElementById('editBookForm')) {
        document.getElementById('editBookForm').addEventListener('submit', async function (event) {
            event.preventDefault();
            const bookId = getBookId();
            const title = document.querySelector("#title").value;
            const description = document.querySelector("#description").value;
            const year = document.querySelector("#year").value;
            const author = document.querySelector("#author").value;
            const publisher = document.querySelector("#publisher").value;
            const pages = document.querySelector("#pages").value;
            const payload = {
                name: title,
                description,
                year,
                author,
                publisher,
                pages,
            };
            const result = await updateBook(bookId, payload);
            location.href = 'book.html?id=' + bookId;
        });
    }

    if (document.getElementById('reviewForm')) {
        document.getElementById('reviewForm').addEventListener('submit', async function (event) {
            event.preventDefault();
            const formData = new FormData(this);
            const bookId = getBookId();
            formData.append('bookId', bookId);
            const result = await addReview(formData);
            location.href = 'book.html?id=' + bookId;
        });
    }

    if (document.getElementById('books')) {
        loadBooks();
    }

    if (document.getElementById('bookDetails')) {
        loadBookDetails();
    }
});

async function loadBooks(page = 1) {
    const books = await fetchBooks(page);
    const user = await getCurrentUser()
    const booksContainer = document.getElementById('books');
    booksContainer.innerHTML = '';
    books.forEach(book => {
        const bookElement = document.createElement('div');
        bookElement.className = 'book';
        bookElement.id = book.book_id
        bookElement.innerHTML = `
        <h2>${book.name}</h2>
        <p>Жанры:${book.genres}</p>
        <p>Год:${book.year}</p>
        <p>Средняя оценка: ${book.avg_rating}</p>
        <p>Рецензий: ${book.count_reviews}</p>
        <button onclick="location.href='book.html?id=${book.book_id}'">Просмотр</button>
        ${canEditBook() ? `<button onclick="location.href='edit-book.html?id=${book.id}'">Редактировать</button>` : ''}
      `;
        if (user.role === 'admin') {
            const editBookBtn = document.createElement("button")
            editBookBtn.textContent = "Изменить"
            const editBookForm = document.getElementById("editBookForm")
            editBookBtn.addEventListener("click", () => {
                window.location.href = 'edit-book.html?id=' + book.book_id
                editBookForm.style.display = 'block'; // Показываем форму
                editBookForm.addEventListener('submit', async function (event) {
                    const token = localStorage.getItem('token');
                    const formData = new FormData(event.target);
                    const changedata = {}
                    formData.forEach((value, key) => changedata[key] = value.trim())
                    await fetch(`http://127.0.0.1:5000/api/book/${book.book_id}`, {
                        method: "PUT",
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify(changedata)
                    });
                    location.href = 'book.html?id=' + getBookId();
                });
            })
            const deleteBtn = document.createElement("button")
            bookElement.append(deleteBtn)
            bookElement.append(editBookBtn)
            deleteBtn.textContent = "Удалить"
            deleteBtn.addEventListener("click", async () => {
                await deleteBook(book.book_id)
                window.location.reload()
            })
        } else {

        }
        booksContainer.appendChild(bookElement);

    });
}

async function loadBookDetails() {
    const bookId = getBookId()
    const book = await fetchBook(bookId);
    const review = await fetchReview(bookId);
    console.log(review)
    const user = await getCurrentUser()
    const reviews = await fetchReviews(bookId)
    console.log(reviews);
    const bookDetailsContainer = document.getElementById('bookDetails');
    const fetchimage = await fetchImage(book.cover_id)
    console.log(fetchimage);
    bookDetailsContainer.innerHTML = `
        <div>
        <h2>Название: ${book.name}</h2>
        <p>Описание: ${book.description}</p>
        <p>Год: ${book.year}</p>
        <p>Издатель: ${book.publisher}</p>
        <p>Автор: ${book.author}</p>
        <p>Страницы: ${book.pages}</p>
        <p>Жанры: ${book.genres}</p>
        </div>
      <img src="${fetchimage.url}" alt="Обложка книги">
    `;
    const reviewContainer = document.getElementById('reviews');
    const reviewsContainer = document.getElementById('allreviews');
    reviewContainer.innerHTML = '';
    reviewsContainer.innerHTML = '';

    if (reviews.msg) {
        if (reviews.msg === "Signature verification failed" ||
            reviews.msg.split('.')[0] === "Bad Authorization header") {
            reviewContainer.innerHTML = `<p>Нет вашей рецензии</p>`
        }

        const dataReviews = await getAllReviews(bookId)
        if (reviews.msg === "Signature verification failed" || reviews.msg.split('.')[0] === "Bad Authorization header") {
            for (let i of dataReviews) {
                console.log(i)
                const reviewsOne = document.createElement('div')
                reviewsOne.className = 'review-one'
                reviewsOne.id = i.id
                reviewsOne.innerHTML = `
                        <div class="review-in">
                        <p>${i.surname}</p>
                        <p>${i.name}</p>
                        </div>
                        <div class="review-in comment">
                        <b><p>Оценка:${i.rating}</p></b>
                        <p>Комментарий:${i.comment}</p>
                        </div>`
                reviewsContainer.append(reviewsOne)
            }
        }
    }else {
        if (review.message === "not found") {
            document.getElementById('reviewButton').style.display = "block"
        } else {
            reviewContainer.innerHTML = `
        <h3>Мой отзыв</h3>
        <p>${"Оценка: " + review.rating}</p>
        <p>${"Отзыв: " + review.comment}</p>
        `
        }
        console.log()

        if (reviews.message === "Not found") {
            reviewsContainer.innerHTML = `
         <h3>Рецензий нет</h3>
         `
        } else {
            for (let i of reviews) {
                console.log(i)
                const reviewsOne = document.createElement('div')
                reviewsOne.className = 'review-one'
                reviewsOne.id = i.id
                reviewsOne.innerHTML = `
        <div class="review-in">
        <p>${i.surname}</p>
        <p>${i.name}</p>
        </div>
        <div class="review-in comment">
        <b><p>Оценка:${i.rating}</p></b>
        <p>Комментарий:${i.comment}</p>
        </div>`
                // let user = await getCurrentUser()
                if (user.role === 'admin' || user.role === 'moderator') {
                    let btnDeleteRew = document.createElement('button')
                    btnDeleteRew.textContent = 'delete'
                    btnDeleteRew.setAttribute('type', 'submit')
                    reviewsOne.append(btnDeleteRew)
                    btnDeleteRew.addEventListener('click', async () => {
                        await deleteReview(reviewsOne.id)
                        location.reload()
                    })
                }


                reviewsContainer.append(reviewsOne)
            }
        }

        const reviewButton = document.getElementById('reviewButton');
        reviewButton.addEventListener('click', function () {
            window.location.href = `review.html?id=${getBookId()}`;
        });

        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const values = document.querySelector("#rating").value;
                const result = await addReview(values);
                window.location.href = `http://127.0.0.1:5500/book.html?id=${getBookId()}`
            });
        }
    }
}

function getBookId() {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get("id");

    return bookId;
}

function canEditBook() {
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'moderator');
}

function canDeleteBook() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

function confirmDelete(bookId, bookTitle) {
    if (confirm(`Вы уверены, что хотите удалить книгу ${bookTitle}?`)) {
        deleteBook(bookId).then(result => {
            if (result.success) {
                alert('Книга успешно удалена');
                location.href = 'index.html';
            } else {
                alert('Ошибка при удалении книги');
            }
        });
    }
}

