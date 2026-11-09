# Sàn Nhảy Quà Tặng

Overlay dọc 9:16 cho livestream: người xem tặng quà thì avatar xuất hiện dưới sàn và nhảy; quà lớn thì nhân vật bước lên sân khấu giữa màn hình, có đèn rọi, vương miện và pháo giấy.

```
san-nhay/
├── index.html          ← toàn bộ phần hiển thị (một file duy nhất)
├── README.md
├── preview.png         ← ảnh chụp bản thử
└── bridge/             ← cầu nối đọc quà thật từ TikTok LIVE
    ├── server.js
    ├── config.json
    └── package.json
```

---

## 1. Xem thử (chưa cần TikTok)

Mở `index.html` bằng Chrome. Trang tự chạy vài món quà mẫu trong 10 giây đầu.

Bấm nút **⚙** ở góc trên bên phải để bật **Tự động thử**, hoặc gõ tên và chọn quà để **gửi quà thử**.

## 2. Luật chơi — sửa ở đầu phần `<script>` của `index.html`

| Món quà | Coin | Kết quả |
|---|---|---|
| Bông hồng | 1 | Nhảy nhỏ dưới sàn, 14 giây |
| Cái kem | 5 | Nhảy nhỏ |
| Gấu bông | 20 | Nhảy to, có hào quang xanh |
| Vương miện | 50 | **Lên sân khấu** |
| Tia chớp | 100 | Lên sân khấu |
| Thiên hà | 500 | Lên sân khấu |

Các chỗ dễ sửa (tất cả ở đầu phần `<script>` của `index.html`):

```js
const GIFTS = [ ... ]      // danh sách quà + số coin
function tierOf(coins){}   // mốc bao nhiêu coin thì lên sân khấu
const TTL = { ... }        // mỗi người xuất hiện bao lâu (giây)

const ICON_NGUOI_XEM = ''; // để trống = chữ cái đầu tên (như hiện tại)
                           // '🕺' = dùng emoji/biểu tượng đó cho mọi người xem
                           // 'https://...' = dùng ảnh từ đường link
const MAU_SAN = { ... }    // đổi màu đường kẻ và ánh sáng của sàn ca-rô
```

Giá quà thật thay đổi theo khu vực; **mở app TikTok xem giá rồi sửa cho khớp**, đừng dùng số trong bản thử.

---

## 3. Đọc tên quà thật từ TikTok LIVE

Đây là phần quan trọng nhất, và cần nói rõ: **TikTok không cung cấp API chính thức cho streamer đọc quà của mình.** Mọi cách đều dựa trên việc đọc luồng dữ liệu (websocket) của trang web TikTok LIVE — chạy được, nhưng là giải pháp không chính thức và có thể hỏng mỗi khi TikTok thay đổi.

Cầu nối trong thư mục `bridge/` làm đúng việc đó:

1. Kết nối vào buổi LIVE của bạn bằng tên tài khoản (không cần mật khẩu, không cần đăng nhập).
2. Nhận sự kiện quà: tên quà, giá trị (diamond), số lần trong chuỗi, tên người tặng, ảnh đại diện.
3. Đẩy sang trang sàn nhảy qua WebSocket — trang tự nhận và cho nhân vật nhảy.

### Cài đặt

Cần **Node.js 18 trở lên** — tải bản LTS tại [nodejs.org](https://nodejs.org), cài bình thường như mọi phần mềm khác.

Xong rồi thì không cần gõ lệnh gì nữa:

- **Windows**: bấm đúp vào `bridge/start.bat`
- **macOS**: bấm đúp vào `bridge/start.command` (lần đầu có thể phải chuột phải → Open)
- **Quen dùng terminal**: mở terminal tại thư mục `bridge`, chạy `npm install` rồi `npm start`

Lần chạy đầu tiên sẽ tự cài thư viện (khoảng 30 giây) và tự mở trình duyệt.

### Cấu hình

Mở `config.json` và điền:

```json
{
  "tiktokUsername": "ten_tai_khoan_cua_ban",
  "signApiKey": "",
  "port": 8080
}
```

- `tiktokUsername`: tên trong đường dẫn `tiktok.com/@...`, không cần dấu `@`.
- `signApiKey`: **không bắt buộc**. Đăng ký miễn phí tại eulerstream.com để lấy khoá — nó giúp tăng giới hạn kết nối. Không có khoá vẫn chạy được nhưng dễ bị giới hạn khi kết nối nhiều lần.
- Tài khoản phải **đang live** thì mới kết nối được.

### Chạy

Bấm file `start.bat` (Windows) hoặc `start.command` (macOS), hoặc chạy `npm start`. Trình duyệt sẽ tự mở `http://127.0.0.1:8080` — chính là sàn nhảy, đã tự nối sẵn với cầu nối. Trong bảng **⚙** sẽ hiện dòng "Đã nối cầu nối quà".

**Cửa sổ đen đó phải để mở trong suốt buổi live.** Đóng nó là trang mất kết nối ngay — giống như rút dây điện.

### Nếu trình duyệt báo "127.0.0.1 refused to connect"

Nghĩa là chưa có chương trình nào chạy ở cổng 8080 — thường là do chưa bấm `start.bat`, hoặc cửa sổ đen đã bị đóng. Kiểm tra theo thứ tự:

1. Cửa sổ đen còn mở không? Nếu đã đóng, bấm `start.bat` lại.
2. Trong cửa sổ đen có dòng `Mở trang tại: http://127.0.0.1:8080` chưa? Chưa có nghĩa là nó đang báo lỗi ở trên — đọc dòng lỗi đó.
3. Cửa sổ đen báo `npm install` thất bại → mất mạng, hoặc chưa cài Node.js.
4. Cửa sổ đen báo **cổng 8080 đang bận** → mở `config.json`, đổi `"port": 8080` thành `8081`, chạy lại, rồi mở `http://127.0.0.1:8081`.

Nếu vẫn không được, chụp lại nguyên cửa sổ đen và gửi tôi.

Terminal sẽ in ra từng món quà:

```
[+] Minh Anh tặng Vương miện (50 coin)
```

### Nếu tên quà hiện sai

Lần đầu nhận quà, cầu nối in ra một dòng `[i] Mẫu dữ liệu quà nhận được:` kèm cấu trúc thật. Chụp dòng đó gửi lại, tôi chỉnh phần đọc cho đúng — TikTok đôi khi đổi tên trường giữa các phiên bản.

### Cách khác: đẩy quà từ công cụ bất kỳ

Cầu nối còn mở một cửa HTTP, dùng được với TikFinity, TikTools hoặc script tự viết:

```bash
curl -X POST http://127.0.0.1:8080/gift \
  -H "content-type: application/json" \
  -d '{"user":"Minh Anh","coins":50,"gift":"Vương miện"}'
```

`GET /status` trả về trạng thái kết nối và số quà đã nhận.

---

## 4. Đưa lên sóng

### OBS (khuyên dùng — giữ được nền trong suốt)

1. Thêm nguồn **Browser Source**, kích thước **1080 × 1920**.
2. URL: `http://127.0.0.1:8080` (hoặc đường dẫn file `index.html`).
3. Tắt **Shutdown source when not visible**.

### TikTok LIVE Studio

LIVE Studio không có Browser Source, nên có hai cách:

- **Window capture**: mở `http://127.0.0.1:8080` bằng Chrome, bấm F11 cho toàn màn hình, rồi *Add source → Window capture* chọn cửa sổ Chrome đó.
- **Qua OBS**: bật *OBS → Start Virtual Camera*, rồi trong LIVE Studio thêm nguồn *Camera* và chọn "OBS Virtual Camera". Cách này giữ được nền trong suốt.

Lưu ý: nền trang hiện là tối đục. Muốn avatar nhảy đè lên hình camera thì cần bật chế độ nền trong suốt — nói tôi biết, tôi thêm.

---

## 5. Ba điều nên biết trước khi chạy thật

- **Đừng hứa đổi quà thành tiền mặt.** TikTok cấm hành vi gài người xem tặng quà; hình phạt thường là mất quyền kiếm tiền dù không bị xoá sóng.
- **Giới hạn số lần lên sân khấu mỗi người.** Nếu một người tặng liên tục chiếm sân khấu, phòng chỉ còn một người xem. Nên thêm luật: tối đa 2 lần/người/30 phút.
- **Sàn có 23 chỗ đứng.** Quá 23 người, người tặng ít coin nhất bị đẩy ra nhường chỗ.

## 6. Có thể làm tiếp

Nền trong suốt để ghép lên camera, hiệu ứng "đi ngang màn hình" cho quà cực lớn, đọc tên bằng giọng nói, lưu bảng vàng qua nhiều buổi live, chế độ hai đội thi nhảy, hoặc đóng gói cầu nối thành file .exe để bấm đúp là chạy.
