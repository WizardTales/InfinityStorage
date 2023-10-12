FROM registry.dev0.wizardtales.com/comcon/pnpm:18
ENV TERM=xterm

USER node
WORKDIR /home/node

COPY node_modules /home/node/node_modules
COPY config.js package.json index.js /home/node/
COPY lib /home/node/lib
COPY database.json.prod /home/node/database.json

EXPOSE 5000
CMD [ "node", "index.js" ]
