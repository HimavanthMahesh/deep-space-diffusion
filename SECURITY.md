# Security and cost controls

The included application is a research and hackathon prototype. A Modal GPU endpoint can create real cloud costs when invoked.

Before exposing an inference endpoint publicly:

- require authentication or a signed request;
- enforce per-user and global rate limits;
- set Modal spending and concurrency limits;
- validate prompt size and accepted parameters at the cloud endpoint as well as the proxy;
- restrict CORS to the deployed frontend origin;
- avoid placing secrets, tokens, or private endpoint credentials in browser code;
- log request identifiers and latency without logging sensitive prompt content;
- return generic client errors while retaining detailed server-side diagnostics.

The local proxy reads `MODAL_URL` from the environment, and both the proxy and cloud method limit prompts to 500 characters. These controls improve baseline behavior but are not a substitute for authentication and rate limiting at the public inference boundary.

If you discover a security issue, report it privately to the repository owner instead of opening a public issue containing exploit details.
