FROM node:fermium-alpine3.13

RUN npm i -g npm && npm i -g @quantum-sec/ci-analysis-collector
