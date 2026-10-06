async function run() {
  const res = await fetch('http://localhost:3000/api/whatsapp/reconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId: 'channel-default', force: true })
  });
  const data = await res.json();
  console.log(data);
}
run();
