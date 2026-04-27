FROM alpine:latest

ARG PB_VERSION=0.22.0

RUN apk add --no-cache unzip ca-certificates

# Download PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# Copy your frontend files into the container
COPY ./pb_public /pb/pb_public

EXPOSE 8080

# Start PocketBase and serve the public folder
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]