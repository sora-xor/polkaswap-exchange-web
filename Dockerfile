FROM nginx:1.19-alpine
COPY ./dist /usr/share/nginx/html
