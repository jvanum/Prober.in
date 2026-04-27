FROM alpine:latest

ARG PB_VERSION=0.22.0

RUN apk add --no-cache unzip ca-certificates

# Download PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# 1. Create the public directory inside the container
RUN mkdir -p /pb/pb_public

# 2. Copy the files from your Root directory
COPY index.html /pb/pb_public/
COPY app.js /pb/pb_public/
COPY app.css /pb/pb_public/
COPY manifest.json /pb/pb_public/
COPY icons/ /pb/pb_public/icons/
# If you have an assets folder for images or notification sounds
# COPY assets/ /pb/pb_public/assets/ 

EXPOSE 8080

# Start PocketBase and serve the public folder
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]