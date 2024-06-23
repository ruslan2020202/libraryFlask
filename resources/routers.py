from flask_restful import Resource
from flask import jsonify, make_response, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required

from database.models import *
from schemas.sheme import *
from utils.save_image import *


# везде где id - это id книги

class Books(Resource):
    def get(self):
        """
        список книг на главной странице
        """
        data = execute_data("""
            SELECT 
                books.id AS book_id, 
                books.name AS name, 
                books.year, 
                GROUP_CONCAT(DISTINCT genres.name) AS genres, 
                FORMAT(AVG(reviews.rating),2) as avg_rating, 
                COUNT(DISTINCT reviews.id) AS count_reviews
            FROM books
            LEFT JOIN book_to_genres ON books.id = book_to_genres.book_id
            LEFT JOIN genres ON book_to_genres.genre_id = genres.id
            LEFT JOIN reviews ON reviews.book_id = books.id
            GROUP BY books.id
            ORDER BY books.year DESC;
        """)

        return BooksSchema(many=True).dump(data), 200

    @jwt_required()
    def post(self):
        """
        создание новой книги
        """
        name = request.form.get('name')
        description = request.form.get('description')
        year = int(request.form.get('year'))
        publisher = request.form.get('publisher')
        author = request.form.get('author')
        pages = int(request.form.get('pages'))
        genres = request.form.getlist('genres')
        # получаем и сохраняем изображение
        img = request.files.get('image')
        filename = img.filename
        file_data = img.read()
        md5_hash = hash_file(file_data)
        cover = Cover.find_by_hash(md5_hash)
        if not cover:
            cover = Cover(filename, img.mimetype, md5_hash)
            cover.save()
        type = cover.mime_type.split("/")
        if f'{cover.id}.{type[1]}' not in [i for i in os.listdir("./uploads")]:
            save_image(f'{cover.id}.{type[1]}', file_data)
        # сохраняем данные
        book = Book(name, description, year, publisher, author, pages, cover.id)
        book.save()
        for i in genres:
            book_to_genre(book.id, int(i)).save()
        return make_response(jsonify({'message': 'success'}), 200)


class WorkBook(Resource):
    def get(self, id):
        """
        получение инфы об одной книге
        """
        data = Book.query.get(id)
        if not data:
            return make_response(jsonify({'message': 'book not found'}), 404)
        book = BookSchema(many=False).dump(data)
        genres = execute_data(f"""
        SELECT group_concat(genres.name)
        from genres
        JOIN book_to_genres on book_to_genres.genre_id = genres.id
        where book_to_genres.book_id = {book['id']};
        """)
        book['genres'] = genres[0][0]
        return book

    @jwt_required()
    def put(self, id):
        """
        изменение книги
        """
        try:
            book = Book.query.get(id)
            if not book:
                return make_response(jsonify({'message': 'book not found'}), 404)
            else:
                name = request.json.get('name')
                description = request.json.get('description')
                year = int(request.json.get('year'))
                publisher = request.json.get('publisher')
                author = request.json.get('author')
                pages = int(request.json.get('pages'))
                book.name = name
                book.description = description
                book.year = year
                book.publisher = publisher
                book.author = author
                book.pages = pages
                book.save()
                return make_response(jsonify({'message': 'book updated'}), 200)
        except Exception as e:
            print(e)
            return make_response(jsonify({'error': str(e)}), 500)

    @jwt_required()
    def delete(self, id):
        """
        удаление книги и обложки
        """
        try:
            book = Book.query.get(id)
            if not book:
                return make_response(jsonify({'message': 'book not found'}), 404)
            else:
                book.delete()
                return make_response(jsonify({'message': 'success'}), 200)
        except Exception as e:
            return make_response(jsonify({'error': 'failed delete'}), 400)


class WriteReview(Resource):
    @jwt_required()
    def get(self, id):
        """
        получаем реценцию
        """
        review = Review.find_review(id, get_jwt_identity())
        if not review:
            print('not one review')
            return make_response(jsonify({'message': 'not found'}), 404)
        else:
            return ReviewSchema(many=False).dump(review), 200

    @jwt_required()
    def post(self, id):
        """
        создаем новую рецензию
        """
        try:
            rating = int(request.json.get('rating'))
            comment = request.json.get('comment')
            Review(id, get_jwt_identity(), rating, comment).save()
            return make_response(jsonify({'message': 'success'}), 200)
        except Exception as e:
            return make_response(jsonify({'error': str(e)}))


class UserInfo(Resource):
    @jwt_required()
    def get(self):
        """
        получаем данные о пользователе
        """
        user_info = execute_data(f"""
        select users.surname, users.name, users.lastname, roles.name as role
        from users
        join roles on users.role_id = roles.id
        where users.id = {get_jwt_identity()}
        """)
        return UserSchema.schema_many(user_info), 200


class GetGenres(Resource):
    def get(self):
        genres = Genre.query.all()
        return GenreSchema(many=True).dump(genres), 200


class GetPicture(Resource):
    def get(self, id):
        type = Cover.query.get(id).mime_type.split("/")
        cover = f'{id}.{type[1]}'
        return send_from_directory('uploads', cover)


class ReviewsBook(Resource):
    @jwt_required()
    def get(self, id):
        data = execute_data(f"""
        select 
            reviews.id, users.surname, users.name, reviews.rating, reviews.comment
        from reviews
        join users on reviews.user_id = users.id
        where reviews.book_id = {id} and users.id != {get_jwt_identity()}
        """)
        if not data:
            print('not all reviews')
            return make_response(jsonify({'message': 'Not found'}), 404)
        else:
            print(ReviewsSchema(many=True).dump(data))
            return ReviewsSchema(many=True).dump(data), 200

    @jwt_required()
    def delete(self, id):
        try:
            review = Review.query.get(id)
            if not review:
                return make_response(jsonify({'message': 'Not found'}), 404)
            else:
                review.delete()
                return make_response(jsonify({'message': 'success'}), 200)
        except Exception as e:
            print(e)
            return make_response(jsonify({'error': str(e)}), 500)


class GetAllReviews(Resource):
    def get(self, id):
        data = execute_data(f"""
        select 
            reviews.id, users.surname, users.name, reviews.rating, reviews.comment
        from reviews
        join users on reviews.user_id = users.id
        where reviews.book_id = {id}
        """)
        print(data)
        if not data:
            print('not all reviews')
            return make_response(jsonify({'message': 'Not found'}), 404)
        else:
            print(ReviewsSchema(many=True).dump(data))
            return ReviewsSchema(many=True).dump(data), 200
