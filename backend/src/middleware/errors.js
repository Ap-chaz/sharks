export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) {
    console.error('Server error:', err.message);
  }
  const message = status >= 500 ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
}
