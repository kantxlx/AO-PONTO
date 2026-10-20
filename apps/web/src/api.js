export async function api(path, method = "GET", body) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.message || "Não foi possível realizar a operação.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
