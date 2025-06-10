# Rust as the base image
FROM rust:1.87 AS build

# Install rustfmt
RUN rustup component add rustfmt

# Download sherpa libs
RUN mkdir /opt/sherpa
RUN wget https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.11.5/sherpa-onnx-v1.11.5-linux-x64-shared.tar.bz2
RUN tar -xvf sherpa-onnx-v1.11.5-linux-x64-shared.tar.bz2 -C /opt/sherpa
ARG SHERPA_LIB_PATH=/opt/sherpa/sherpa-onnx-v1.11.5-linux-x64-shared

# Getting prebuilt binary from llvm 
RUN apt-get update && apt-get install -y lsb-release wget software-properties-common gnupg && apt-get clean all
RUN bash -c "$(wget -O - https://apt.llvm.org/llvm.sh)"


# Create a new empty shell project
RUN USER=root cargo new --bin tts
WORKDIR /tts

# Copy our manifests
COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

# Disable download-binaries feature of sherpa
RUN cargo remove sherpa-rs
RUN cargo add sherpa-rs --features=tts --no-default-features

# Build only the dependencies to cache them
RUN cargo build --release
RUN rm src/*.rs

# Copy the source code
COPY ./src ./src

# Build for release.
RUN rm ./target/release/deps/tts*
RUN cargo build --release

# The final base image
FROM debian:bookworm-slim

# Copy from the previous build
RUN mkdir /opt/tts
COPY --from=build /tts/target/release/tts /opt/tts/tts
COPY --from=build /opt/sherpa/sherpa-onnx-v1.11.5-linux-x64-shared/lib/* /usr/lib
COPY ./data /opt/tts/data
COPY ./log4rs.yml /opt/tts/log4rs.yml
COPY ./config.docker.json /opt/tts/config.json

# Run the binary
WORKDIR /opt/tts
CMD ["/opt/tts/tts"]