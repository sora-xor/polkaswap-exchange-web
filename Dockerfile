FROM nginx:1.19-alpine
COPY ./build /usr/share/nginx/html
