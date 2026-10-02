# syntax=docker/dockerfile:1
# QA 숍 API — 빌드 단계와 실행 단계를 나눈다. 베이스 이미지는 amd64/arm64 멀티 아키텍처.
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY db ./db
COPY openapi.yaml ./openapi.yaml
# root 로 시작해 로그 폴더 권한만 맞춘 뒤 서버가 스스로 node 사용자로 권한을 낮춘다 (src/lib/privileges.ts).
EXPOSE 3000
CMD ["node", "dist/server.js"]
