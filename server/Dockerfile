# Rust as the base image
FROM rust:1.87 AS build

# Create a new empty shell project
RUN USER=root cargo new --bin writinggame-server
WORKDIR /writinggame-server

# Copy our manifests
COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

# Build only the dependencies to cache them
RUN cargo build --release
RUN rm src/*.rs

# Copy the source code
COPY ./src ./src

# Build for release.
RUN rm ./target/release/deps/writinggame_server*
RUN cargo build --release

# The final base image
FROM debian:bookworm-slim

# Copy from the previous build
RUN mkdir /opt/writinggame-server
COPY --from=build /writinggame-server/target/release/writinggame-server /opt/writinggame-server/writinggame-server
COPY ./log4rs.yml /opt/writinggame-server/log4rs.yml
COPY ./config.docker.json /opt/writinggame-server/config.json

# Run the binary
WORKDIR /opt/writinggame-server
CMD ["/opt/writinggame-server/writinggame-server"]