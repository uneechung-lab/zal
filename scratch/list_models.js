async function listModels() {
  const apiKey = "AIzaSyCpARHc--ssO6JSInpn9ouRq4f6pvzopSQ";
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
listModels();
