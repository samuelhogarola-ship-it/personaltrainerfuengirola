FROM node:22-alpine

WORKDIR /app/site
COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PERSONAL_SITE_ROOT=/app/site
ENV PERSONAL_CONTENT_DIR=/app/site-data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --spider --quiet http://127.0.0.1:3000/health || exit 1

CMD ["sh", "-c", "sh scripts/render-umami-config.sh && exec node scripts/start-site.mjs"]
