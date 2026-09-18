// ============================================================
//  Bốc Team Liên Quân — script.js
//  Thuật toán chính có comment tiếng Việt.
// ============================================================

// ===== 1. Dữ liệu tướng (dùng thẳng link ảnh, không fetch/canvas) =====
const HEROES_DATA = [
    { "name": "Tamyn", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2026/07/SeaTalk_IMG_20260722_163230-1.jpg" },
    { "name": "Flowborn", "imgUrl": "https://lienquanmobile.gg/wp-content/uploads/2026/05/Flowborn-Xa-Thu.png" },
    { "name": "Flowborn Pháp Sư", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2026/04/IMG-SQR-0200x0200-080148-2.jpg" },
    { "name": "Dyadia", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2026/01/SeaTalk_IMG_20260119_104427.jpg" },
    { "name": "Edras", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2025/10/edrashead-2.jpg" },
    { "name": "Goverra", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2025/07/goverra-1.jpg" },
    { "name": "Heino", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2025/04/heino-2.jpg" },
    { "name": "Billow", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2025/01/59900-2.jpg" },
    { "name": "Bolt Baron", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/11/bolt-baron-225.jpg" },
    { "name": "Biron", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/10/biron-artwork-1.jpg" },
    { "name": "Dolia", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/07/15900s.jpg" },
    { "name": "Charlotte", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/07/20600s.jpg" },
    { "name": "Tachi", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/ea94a6f76e867283974c8ced9d3aa2c5658d3150230cf1.jpg" },
    { "name": "Dirak", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/ab0b68ebd2e8df3116d91231ec0e55fc5e16e1f05c8701-1.jpg" },
    { "name": "Qi", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/6da178e8a2c2871aeb856bec0f669ccd5d5684e01acd31.jpg" },
    { "name": "Erin", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/a1d3b1c36a643cb6d58c704139a2c24d65af7afac34cb1.jpg" },
    { "name": "Ming", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/58ba051be8f5ab56c0ea840ceb29c489658d529e847cf1.jpg" },
    { "name": "Bijan", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/856d30cb10953b9480dce5c5470bf81c658d50d87305a1.jpg" },
    { "name": "Bonnie", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/a2ed1b1815df9c719e4f9b4be5eb3a74658d4cd7d3ef61.jpg" },
    { "name": "Teeri", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/3499773a79087475e48194e0fd02e27d658d428c2cbe51.jpg" },
    { "name": "Yue", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/3ee26051086fee856dc6df74811e9e35658d4142ce14c1.jpg" },
    { "name": "Yan", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/f9471319a98fac8dce266dc86cd1efea658d4042ae0051.jpg" },
    { "name": "Aya", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/d4510fa53f153c5e259543597c96bb88658d3efcbcd0f1.jpg" },
    { "name": "Aoi", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/f1db425eba8ea88e5d4d8427c1706bcf6100183de1cc11.jpeg" },
    { "name": "Iggy", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/b4563fbfd5756caeea04b7ef488ee39f60fffd803e9ab1.jpeg" },
    { "name": "Bright", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/0045a9d59dc140647f4fa67b446c732c5fc55919650441.jpg" },
    { "name": "Lorion", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/dab2c45af3206cd0ac30b450357aa8ce5fc5264d71f451.jpg" },
    { "name": "Dextra", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/38f3158929eb4b95500db65559e52d525fc5244a521d11.jpg" },
    { "name": "Sinestrea", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/680ef284724e077237f33cfc2d8fa72d5fa194bad60f31.jpg" },
    { "name": "Thorne", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/dd8031b80a4fc5978cdd4886a65a6eb35f5070fd5d0221.jpg" },
    { "name": "Allain", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/3aa1f0f335f87801117dbfa1d69b072b5ef1f1c297fe21.jpg" },
    { "name": "Zata", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/fcd5c439a7cc37896ab98d568b662bec5ec66637da75d1.jpg" },
    { "name": "Rouie", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/7f7ce6b3593a8ea52de5fa3be55469f85eb1402d093b71.jpg" },
    { "name": "Laville", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/c30059d2dc46ed31b72a4b02aa9e61f75eb136829228d1.jpg" },
    { "name": "Paine", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/47861c6d53d72d0dbea2d1dba0b0e0365e8ade6f180931.jpg" },
    { "name": "Ata", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/71f7a36c0dd250ce0affeffcf14360f45e57c0420b4b61.jpg" },
    { "name": "Keera", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/8491520381ab2a66489a6c5e1ec98e785e452a5c9fd3c1.jpg" },
    { "name": "Ishar", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/1009dcdfe78de2f6bc7fbdaea21cabc05df2198341d451.jpg" },
    { "name": "Eland'orr", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/060f8e35db2f7fb1be51d7e5bdd1724a5db174d49d9de1.jpg" },
    { "name": "Krizzix", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/a7e49f01ef9804d479cb6537a9b51dee5db6c75c945151.png" },
    { "name": "Volkath", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/219b09a656af5274629409109ea2802d5d9472fe58bd81.jpg" },
    { "name": "Celica", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/194741793e21d4392965d4d63515e78b5d6fa738d07e61.jpg" },
    { "name": "Zip", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/e0f8f382d1be41adc8947bf1b849479b5d3823c7418f71.jpg" },
    { "name": "Enzo", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/81d7c827262287ce87639f3bfa048f5a5d149a6d571091.jpg" },
    { "name": "Yena", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/61fa157164bf9d99e65bf40b802fb5745cfe1cd72c4671.jpg" },
    { "name": "Errol", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/5067bb53ba6435e11cc8777645d8de115cc136a9ca3b31.jpg" },
    { "name": "Capheny", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/5c3212f3d7a6f95ad04a309d4d1f340a5ca5c222bda911.jpg" },
    { "name": "Hayate", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/02c8e3d1db8ee8f32913b478884f33e05c8f254a7686f1.jpg" },
    { "name": "D'Arcy", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/903191ed8212c2c6c91f1f6f0a677a565c6102d8ecf4a1.jpg" },
    { "name": "Veres", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/46c5f246040b9e750779aa41ffcbeaa15c3f06d63ce241.jpg" },
    { "name": "Florentino", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/9527c1cbad1c0656d0a4adf1dcec38e35c25f62d77d671.jpg" },
    { "name": "Sephera", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/eef053fb25793d536185559e8bf5a82d5c132caaa102e1.jpg" },
    { "name": "Quillen", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/f6004ed060dcff380fc5b13574986bbc5bf778bc905561.jpg" },
    { "name": "Wiro", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/61015ea8f83c0a833833297bb927ccd35be3c4834cd261.jpg" },
    { "name": "Richter", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/e6e08d2cc322676442cf420e4aefb6d85bd7d7620754b1.jpg" },
    { "name": "Elsu", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/449789489494c0f108a3db5db3098e585bc98d17e666b1.jpg" },
    { "name": "Y'bneth", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/173809566ede28d1fee0731e43a1912c5b98deb97c82f1.jpg" },
    { "name": "Amily", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/65b8d8e674af00ee4ecbb4030e8fac385b88ea13824d31.jpg" },
    { "name": "Annette", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/17f4f562b9121128b4aff9e7b41644185f041e77964551.jpg" },
    { "name": "Baldum", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/e751e70db18557783c2d23c9e5383e095b6bb947482b11.jpg" },
    { "name": "Roxie", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/51400-1.jpg" },
    { "name": "Marja", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/1303e95b29e784888ae02d97848aed775b2b84e0372771.jpg" },
    { "name": "Rourke", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/749d47479eb9744d656b5e7c59f213555b1914bf90d291.jpg" },
    { "name": "Arum", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/7faf7c96faeb8721b936e323becb57265afea9c3c8b281.jpg" },
    { "name": "Wisp", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/f3a7fe63c79a26ea789064ea3361781f5aec0b6084aa01.jpg" },
    { "name": "The Flash", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/dbb8d783c711cc0d2961e72cc8ed122c5ad9685dd58c11.jpg" },
    { "name": "Max", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/18000_B52-1.jpg" },
    { "name": "Liliana", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/28b06811cb721a8ecb28d6a1db401e745a9fd3a39ae401.jpg" },
    { "name": "Tulen", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/07210c9e529faa7766ba324bd86b75165a81722f3eab81.jpg" },
    { "name": "Omen", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/00a78d4f7222a428cd06b45252f88a565a73df2c56ad81.jpg" },
    { "name": "Lindis", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/4b2928793044600d4ca60ec95fb31f205a73d88927ca01.jpg" },
    { "name": "TeeMee", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/d048143eef92ff2734c99f53b46e19db5a4dabef8a0fe1.jpg" },
    { "name": "Moren", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/acqqwc-1.jpg" },
    { "name": "Kil'Groth", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/4dd76a3f07965ade3c71b89874b64b935a29291ca4a111.gif" },
    { "name": "Xeniel", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/a56369ce162e24700689527a54d89b755a179e8628f391.jpg" },
    { "name": "Wonder Woman", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/108ae03944a6aa1eb4313a2baa64efcd5a0e6c1551db11.jpg" },
    { "name": "Superman", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/3310a88f1a679a6940e2f6e0da287c415a02b6ac709e01.jpg" },
    { "name": "Tel'Annas", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/5064b1bbcb8dcac94f88292537d6c35459e96577aa90c1.jpg" },
    { "name": "Astrid", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/91a969152f4340611e12e4eeb96a9aa259e021a48fbe91.jpg" },
    { "name": "Ryoma", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/2f3fe854b98e664415c024a1e9f0396259d9b9ddb39921.jpg" },
    { "name": "Stuart", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/aaba7b63f6e2f5577fbb3465925c8026658d3d704767f1.jpg" },
    { "name": "Arduin", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/8ac7305489de39cfaa10eb13f5a7824559bb7d0c7f2cc1.jpg" },
    { "name": "Zill", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/b1a6c37ad9558ac5767e25ded5b6fcf759966ca7c1d431.jpg" },
    { "name": "Murad", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/7dba55e7f433ab78ac6bd2cdfeec13495983e122346461.jpg" },
    { "name": "Ignis", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/a2c0e8ef7742c926f9bb10fbab12b03d5970da7009dc11.jpg" },
    { "name": "Zuka", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/d5166c51f37b444810f2ae3df056920d5c4938c59a4821.jpg" },
    { "name": "Airi", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/04999ff87145b9005694ffd78e1530a660017059a8fc11.jpg" },
    { "name": "Kaine", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/bb649e26633a61d78f7147d56c0828c6658d3bb600ae01.jpg" },
    { "name": "Lauriel", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/18d4327ac2e366a736a060be082bbbef5943917dab8d81.jpg" },
    { "name": "Raz", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/6b79035779ab9195c76d91b3f2e7ca79591e6857831601.jpg" },
    { "name": "Skud", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/2b128ebef47ab5a8a2ae9d3db754cd585ee5e21149f621.jpg" },
    { "name": "Preyta", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/f2f8893606262e7c0547c4f47f670995590bf38eabfc81.jpg" },
    { "name": "Ilumia", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/7ae8bcd437d0787c9f3bb9aa54907ede5ef5e858aff141.jpg" },
    { "name": "Slimz", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/122fe2fc229ca42dcbe6946db07ccd435b345a87702a11.png" },
    { "name": "Arthur", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/06/Honeyview_Arthur_111-e1718875297358.jpg" },
    { "name": "Kriknak", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/0dac2ca73eb28c03de2e43f85e868df458e710b5baeb41.png" },
    { "name": "Ngộ Không", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/aea009bf921dd684d19ee76c0c1441215ef5c39d1bd6b1.jpg" },
    { "name": "Maloch", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/752c4c954aa4a8f05a1b0be72aa5dc895c0def4d435aa1.jpg" },
    { "name": "Helen", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/e645dfa331fa48d593b33352e1f8030e636e1b3e19b951.jpg" },
    { "name": "Jinna", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/f3b0dc924b34f76c9265adb57758817a5b752794c417a1.jpg" },
    { "name": "Cresht", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/04b0a1140d89b8ef0cd4a655753bbb895c4938662bc9f1.jpg" },
    { "name": "Natalya", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/a450850337d6a5d19250b1d1e39692f15eccc530c915e1.jpg" },
    { "name": "Lumburr", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/119dc57d5a3a59b520b93a42301ffb135e7dedbf1c28a1.jpg" },
    { "name": "Fennik", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/ab3f51a9731ffa085fd56a87139b8a775860e26837e191.jpg" },
    { "name": "Aleister", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/15600.jpg" },
    { "name": "Grakk", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/040403525e2882c0e3a6794c31976c89585357ba19a351.png" },
    { "name": "Nakroth", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/c7b840bdacd7e5a8b83af72ccd9ca1815ec64fdc5ffeb1.jpg" },
    { "name": "Taara", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/f69423f533b12cbcd8ab15a7127e1e445e79e0b77e4ec1.jpg" },
    { "name": "Toro", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/ffd2c29391b67831e97a0b16534a65d45ef5921c2bcb41.jpg" },
    { "name": "Yorn", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/44086d0bc26a170b21038a7cbf9413365c4938b95b2f91.jpg" },
    { "name": "Gildur", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/10800_B40-1.jpg" },
    { "name": "Alice", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/b9dd8e24c0fbad107475f6e31f5e36365847d373da15b1.png" },
    { "name": "Azzen'Ka", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/12700_B51-1.jpg" },
    { "name": "Ormarr", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/fd2a04f2b129ef58988f2d311eac83e45b6d0919e7d901.jpg" },
    { "name": "Butterfly", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/769a9fe6cb9b9725127a094bb6dd36545f0ed6543592e1.jpg" },
    { "name": "Violet", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/f91d8c95b3b0c11c6fe5b8ac20e48cbd5d25650254d571.jpg" },
    { "name": "Chaugnar", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/3eb3c69cef807c5706a98cc4b799619b5b3456990e6501.jpg" },
    { "name": "Điêu Thuyền", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/d93ee5059a95c391548419e69b6b9d1a5d2564f4eba891.jpg" },
    { "name": "Zephys", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/zephys-1.jpg" },
    { "name": "Kahlii", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/fe313975ef498b33a7bf995a05d6f8b75847d42a599181.png" },
    { "name": "Omega", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/cb7b811e7978882aefac079de6c93daf5fbcc5716f8ad1.jpg" },
    { "name": "Triệu Vân", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/d7088075d6e144e11f476782718320865d256521539c41.jpg" },
    { "name": "Mganga", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/053654897539713c86a745376bc8e8125d25652cf33f01.jpg" },
    { "name": "Krixi", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/7f04b1fd7f0520dd1ccbd1caad6faf1a5847d3f72e85b1.png" },
    { "name": "Mina", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/09d93eb47007482254115f99686694d25847d3e83fdf41.png" },
    { "name": "Lữ Bố", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/ecbf2434edb2b16cc0d5b286a88ab4335d2565110472b1.jpg" },
    { "name": "Veera", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/82a7e1d31f6b20d3faa502e1a215b76c6595119091e7a2-e1718879982854.jpg" },
    { "name": "Thane", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/71e488144b7dc9f13d40321ce0556efc5847d39f2071a1.png" },
    { "name": "Valhein", "imgUrl": "https://lienquan.garena.vn/wp-content/uploads/2024/05/4b36c6e5e2d1ce9dd9e2841d2902043c5ee04efeb2f2d1.jpg" }
];

// ===== Firebase Live Share =====
// HƯỚNG DẪN: Tạo Firebase project tại https://console.firebase.google.com
// 1. Tạo project mới (hoặc dùng project có sẵn)
// 2. Bật Realtime Database trong Build > Realtime Database
// 3. Set Rules: { "rules": { "sessions": { "$sessionId": { ".read": true, ".write": true } } } }
// 4. Copy config từ Project Settings > General > Your apps > Web app
// 5. Dán vào下方 FIREBASE_CONFIG
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyADOWz8HRG1y1VOXuZUXfdsl1EQh_BOu0A",
    authDomain: "customaov.firebaseapp.com",
    databaseURL: "https://customaov-default-rtdb.firebaseio.com",
    projectId: "customaov"
};

let firebaseApp = null;
let db = null;
let currentSessionId = null;
let isLiveMode = false;   // true = viewer mode (URL có ?live=)
let isHost = false;
let sessionRef = null;     // Firebase ref cho phiên hiện tại

function initFirebase() {
    if (firebaseApp) return;
    try {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
    } catch (e) {
        console.error('Firebase init failed:', e);
        alert('⚠️ Không kết nối được Firebase. Kiểm tra lại config.');
    }
}

function generateSessionId() {
    return 'live_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function getDeviceId() {
    let id = localStorage.getItem('live_device_id');
    if (!id) {
        id = 'dev_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('live_device_id', id);
    }
    return id;
}

// ===== ADMIN KEY SYSTEM =====
const ADMIN_KEY_STORAGE = 'lq_admin_key';
const ADMIN_KEY_HASH_KEY = 'lq_admin_hash';

// Hash key expected (Suthy0704@@)
const EXPECTED_KEY_HASH = '9aab60ed'; // Suthy0704@@ hash by djb2

// Simple hash (djb2) — unsigned
function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash >>> 0; // Convert to unsigned 32bit
    }
    return hash.toString(16);
}

// Kiểm tra admin key đã setup chưa
function isAdminSetup() {
    return localStorage.getItem(ADMIN_KEY_HASH_KEY) != null;
}

// Verify admin key
function verifyAdminKey(key) {
    const stored = localStorage.getItem(ADMIN_KEY_HASH_KEY);
    return stored === simpleHash(key);
}

// Verify against expected key (hardcoded)
function verifyExpectedKey(key) {
    return simpleHash(key) === EXPECTED_KEY_HASH;
}

// Setup admin key (lần đầu — chỉ khi key khớp expected)
function setupAdminKey(key) {
    if (!verifyExpectedKey(key)) return false;
    localStorage.setItem(ADMIN_KEY_HASH_KEY, simpleHash(key));
    return true;
}

// Đổi admin key
function changeAdminKey(oldKey, newKey) {
    if (!verifyAdminKey(oldKey)) return false;
    if (!verifyExpectedKey(newKey)) return false;
    localStorage.setItem(ADMIN_KEY_HASH_KEY, simpleHash(newKey));
    return true;
}

// Prompt admin key — chỉ xác minh
function ensureAdminKey() {
    if (!isAdminSetup()) {
        alert('⚠️ Admin key chưa được setup!\nBấm "Setup admin key" để bắt đầu.');
        return false;
    }
    const key = prompt('🔐 Nhập admin key:');
    if (!key) return false;
    if (!verifyAdminKey(key)) {
        alert('❌ Sai admin key!');
        return false;
    }
    return true;
}

// Setup admin key (chỉ khi CHƯA có key và key khớp expected)
function initialSetupAdminKey() {
    if (isAdminSetup()) {
        alert('Admin key đã được setup!');
        return;
    }
    const key = prompt('🔐 SETUP ADMIN KEY\nNhập admin key:');
    if (!key) return;
    if (!verifyExpectedKey(key)) {
        alert('❌ Sai admin key!');
        return;
    }
    setupAdminKey(key);
    alert('✅ Admin key đã được lưu!');
}

// Host: tạo phiên live mới
async function createLiveSession() {
    // Verify admin key
    if (!ensureAdminKey()) return null;

    initFirebase();
    if (!db) return null;

    const sessionId = generateSessionId();
    const activePlayers = state.players.filter(p => p.active !== false);

    const sessionData = {
        createdAt: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
        hostId: getDeviceId(),
        status: 'waiting',
        sessionName: 'Bốc Team - ' + new Date().toLocaleDateString('vi-VN'),
        settings: { ...state.settings },
        players: activePlayers.map(p => ({
            id: p.id,
            name: p.name,
            tier: p.tier,
            active: p.active
        })),
        currentReveal: -1,
        reveals: [],
        viewers: {}
    };

    try {
        await db.ref('sessions/' + sessionId).set(sessionData);
        currentSessionId = sessionId;
        isHost = true;
        return sessionId;
    } catch (e) {
        console.error('Create session failed:', e);
        alert('⚠️ Không tạo được phiên live. Thử lại!');
        return null;
    }
}

// Host: sync kết quả chia team lên Firebase
function syncTeams(teamsData) {
    if (!currentSessionId || !isHost || !db) return;
    // Verify host identity
    db.ref('sessions/' + currentSessionId + '/hostId').once('value', (snap) => {
        if (snap.val() !== getDeviceId()) {
            console.error('Host verification failed: identity mismatch');
            return;
        }
        const updates = {};
        updates['sessions/' + currentSessionId + '/teams'] = {
            teamA: teamsData.teamA.map(p => ({
                name: p.name, tier: p.tier, role: p.role, avatar: p.avatar,
                champion: p.champion, championWarn: p.championWarn,
                side: 'a'
            })),
            teamB: teamsData.teamB.map(p => ({
                name: p.name, tier: p.tier, role: p.role, avatar: p.avatar,
                champion: p.champion, championWarn: p.championWarn,
                side: 'b'
            })),
            nameA: teamsData.nameA,
            nameB: teamsData.nameB,
            balance: teamsData.balance || {}
        };
        updates['sessions/' + currentSessionId + '/settings'] = { ...state.settings };
        updates['sessions/' + currentSessionId + '/status'] = 'live';
        updates['sessions/' + currentSessionId + '/reveals'] = null;
        db.ref().update(updates);
    });
}

// Host: sync 1 reveal (1 người đã reveal xong)
function syncReveal(index, revealData) {
    if (!currentSessionId || !isHost || !db) return;

    // Rate limit
    const now = Date.now();
    if (now - lastRevealTime < REVEAL_COOLDOWN) {
        console.warn('Reveal rate limited');
        return;
    }
    lastRevealTime = now;

    // Verify host identity
    db.ref('sessions/' + currentSessionId + '/hostId').once('value', (snap) => {
        if (snap.val() !== getDeviceId()) {
            console.error('Host verification failed: identity mismatch');
            return;
        }
        const updates = {};
        updates['sessions/' + currentSessionId + '/currentReveal'] = index;
        updates['sessions/' + currentSessionId + '/reveals/' + index] = {
            index: index,
            name: revealData.name,
            role: revealData.role,
            champion: revealData.champion,
            championWarn: revealData.championWarn || false,
            side: revealData.side
        };
        db.ref().update(updates);
    });
}

// Host: kết thúc phiên live
function endLiveSession() {
    if (!currentSessionId || !isHost || !db) return;
    // Verify host identity
    db.ref('sessions/' + currentSessionId + '/hostId').once('value', (snap) => {
        if (snap.val() !== getDeviceId()) {
            console.error('Host verification failed: identity mismatch');
            return;
        }
        db.ref('sessions/' + currentSessionId + '/status').set('done');
        currentSessionId = null;
        isHost = false;
    });
}

// Host: xóa phiên live (dọn dẹp)
function deleteLiveSession() {
    if (!currentSessionId || !isHost || !db) return;
    db.ref('sessions/' + currentSessionId).remove();
    currentSessionId = null;
    isHost = false;
}

// Viewer: kết nối vào phiên live
function joinLiveSession(sessionId) {
    initFirebase();
    if (!db) return;

    isLiveMode = true;
    isHost = false;
    currentSessionId = sessionId;

    viewerResetState();
    viewerTeamsHash = '';
    viewerRevealMode = '';

    document.querySelector('.app').classList.add('viewer-mode');
    $('viewerArea').hidden = false;

    sessionRef = db.ref('sessions/' + sessionId);

    // Kiểm tra session tồn tại + viewer count
    sessionRef.once('value', (snap) => {
        const data = snap.val();
        if (!data) {
            $('viewerTitle').textContent = '❌ Phiên không tồn tại';
            $('viewerContent').innerHTML = '<p style="text-align:center;color:var(--muted)">Link không hợp lệ.</p>';
            sessionRef = null;
            return;
        }

        // Check viewer count
        const viewerCount = data.viewers ? Object.keys(data.viewers).length : 0;
        if (viewerCount >= 20) {
            $('viewerTitle').textContent = '❌ Phiên đã đầy (tối đa 20 người xem)';
            $('viewerContent').innerHTML = '<p style="text-align:center;color:var(--muted)">Vui lòng thử lại sau.</p>';
            sessionRef = null;
            return;
        }

        // Register this viewer
        const viewerId = getDeviceId();
        db.ref('sessions/' + sessionId + '/viewers/' + viewerId).set(true);

        // Listen for updates
        sessionRef.on('value', (snap) => {
            const data = snap.val();
            if (!data) {
                $('viewerTitle').textContent = '❌ Phiên đã kết thúc';
                $('viewerContent').innerHTML = '<p style="text-align:center;color:var(--muted)">Phiên không còn tồn tại.</p>';
                viewerResetState();
                return;
            }
            renderViewerSession(data);
        }, (err) => {
            console.error('Firebase read error:', err);
            $('viewerTitle').textContent = '❌ Lỗi kết nối';
        });
    });
}

// Viewer: ngắt kết nối
function leaveLiveSession() {
    if (sessionRef && currentSessionId && db) {
        // Remove self from viewers
        const viewerId = getDeviceId();
        db.ref('sessions/' + currentSessionId + '/viewers/' + viewerId).remove();
        sessionRef.off();
        sessionRef = null;
    }
    isLiveMode = false;
    currentSessionId = null;
    document.querySelector('.app').classList.remove('viewer-mode');
    $('viewerArea').hidden = true;
}

// Auto-cleanup viewer on page close
window.addEventListener('beforeunload', () => {
    if (isLiveMode && currentSessionId && db) {
        const viewerId = getDeviceId();
        db.ref('sessions/' + currentSessionId + '/viewers/' + viewerId).remove();
    }
});

// ===== VIEWER SYSTEM =====
// Viewer state
let viewerRendered = false;
let viewerFlippedCards = new Set();
let viewerSpinnersDone = new Set();
let viewerCurrentOrder = [];
let viewerTeamsHash = '';
let viewerRevealMode = '';
let viewerAudioCtx = null;

// Rate limiting for reveals
let lastRevealTime = 0;
const REVEAL_COOLDOWN = 500; // ms

// Viewer: phát âm thanh
function viewerBeep(freq, dur, type) {
    try {
        if (!viewerAudioCtx) viewerAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = viewerAudioCtx.createOscillator();
        const g = viewerAudioCtx.createGain();
        o.type = type || 'square';
        o.frequency.value = freq || 440;
        g.gain.value = 0.06;
        o.connect(g); g.connect(viewerAudioCtx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.001, viewerAudioCtx.currentTime + dur);
        o.stop(viewerAudioCtx.currentTime + dur);
    } catch (e) {}
}
function viewerPlayFlip() { viewerBeep(620, 0.08, 'triangle'); }
function viewerPlayTada() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => viewerBeep(f, 0.2, 'triangle'), i * 110)); }
function viewerPlayTick() { viewerBeep(800, 0.03, 'square'); }

// Viewer: reset state
function viewerResetState() {
    viewerRendered = false;
    viewerFlippedCards.clear();
    viewerSpinnersDone.clear();
    viewerCurrentOrder = [];
}

// ===== Viewer: render chính =====
function renderViewerSession(data) {
    const title = $('viewerTitle');
    const content = $('viewerContent');
    const badge = $('viewerStatusBadge');

    // Check session expiry
    if (data.expiresAt && Date.now() > data.expiresAt) {
        badge.hidden = true;
        title.textContent = '⏰ Phiên đã hết hạn';
        content.innerHTML = '<p style="text-align:center;color:var(--muted)">Phiên đã hết hạn sau 1 giờ.</p>';
        viewerResetState();
        return;
    }

    // Badge
    if (data.status === 'live' || data.status === 'waiting') {
        badge.hidden = false;
        badge.textContent = data.status === 'live' ? '🔴 LIVE' : '⏳ ĐANG CHỜ';
    } else {
        badge.hidden = true;
    }

    // Chưa có teams → chờ
    if (!data.teams) {
        title.textContent = '⏳ Đang chờ host bốc thăm...';
        viewerResetState();
        content.innerHTML = `
            <div class="viewer-waiting">
                <div class="spinner"></div>
                <p>Phiên: <b>${data.sessionName || 'Live'}</b></p>
                <p style="font-size:13px;margin-top:8px">Host đang chuẩn bị. Đợi chút...</p>
            </div>
        `;
        return;
    }

    title.textContent = `🔴 ${data.teams.nameA} vs ${data.teams.nameB}`;

    const revealMode = data.settings?.revealMode || 'secretBox';
    const teamsHash = JSON.stringify(data.teams.teamA.map(p => p.name)) + JSON.stringify(data.teams.teamB.map(p => p.name));

    // Detect thay đổi → force re-render
    if (teamsHash !== viewerTeamsHash || revealMode !== viewerRevealMode) {
        viewerResetState();
        viewerTeamsHash = teamsHash;
        viewerRevealMode = revealMode;
    }

    // Đã render xong và không đổi gì → update reveals
    if (viewerRendered) {
        if (revealMode === 'secretBox') {
            viewerUpdateSecretBox(data);
        } else {
            viewerUpdateSlotMachine(data);
        }
        viewerCheckDone(data);
        return;
    }

    // Render mới
    viewerRendered = true;

    if (revealMode === 'secretBox') {
        viewerRenderSecretBox(data);
    } else {
        viewerRenderSlotMachine(data);
    }

    viewerCheckDone(data);
}

function viewerCheckDone(data) {
    if (data.status === 'done') {
        viewerPlayTada();
        if (typeof confetti === 'function') confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
}

// ===== Viewer: Secret Box =====
function viewerRenderSecretBox(data) {
    const content = $('viewerContent');
    const teams = data.teams;
    const reveals = data.reveals || [];

    let html = `<div class="teams-grid">`;
    html += viewerSecretBoxColumn(teams.teamA, teams.nameA, teams.balance?.teamA, 'a', reveals, 0);
    html += `<div class="team-vs">VS</div>`;
    html += viewerSecretBoxColumn(teams.teamB, teams.nameB, teams.balance?.teamB, 'b', reveals, teams.teamA.length);
    html += `</div>`;
    content.innerHTML = html;
}

function viewerSecretBoxColumn(team, name, percent, side, reveals, startIndex) {
    const cards = team.map((p, i) => {
        const globalIdx = startIndex + i;
        const r = reveals[globalIdx];
        const isRevealed = r != null;
        // host chỉ render flip-front, KHÔNG render flip-back chứa img
        // flip-back render sau khi reveal
        return `
        <div class="flip-card" data-side="${side}" data-idx="${i}">
            <div class="card-left">
                <span class="f-avatar">${avatarHtml(p.avatar)}</span>
            </div>
            <div class="flip-zone">
                <div class="flip-inner">
                    <div class="flip-face flip-front">
                        <span class="f-question">?</span>
                    </div>
                    <div class="flip-face flip-back">
                        ${p.champion ? `<img class="f-champ-img" src="${heroImg(p.champion)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23333%22/><text x=%2250%25%22 y=%2255%25%22 fill=%22%23fff%22 font-size=%2230%22 text-anchor=%22middle%22>❓</text></svg>'">` : `<span class="f-champ-free">🖐</span>`}
                    </div>
                </div>
            </div>
            <div class="card-info">
                <span class="f-name">${p.name}</span>
                <span class="f-role">${p.role === 'flex' ? 'Vị trí tự chọn' : ROLE_LABELS[p.role] || p.role}</span>
                <span class="f-champ-name">${p.champion ? (p.championWarn ? '⚠️ ' : '') + '<span class="champ-reveal">???</span>' : 'Tự chọn tướng'}</span>
            </div>
            ${p.champion ? `<span class="champ-hidden-text hidden">${p.champion}${p.championWarn ? ' ⚠️' : ''}</span>` : ''}
        </div>`;
    }).join('');
    return `<div class="team-col">
        <h3>${side === 'a' ? '🔵' : '🔴'} ${name}</h3>
        ${percent !== undefined ? `<div class="team-percent">💪 ${percent}% sức mạnh</div>` : ''}
        <div class="box-grid">${cards}</div>
    </div>`;
}

function viewerUpdateSecretBox(data) {
    const reveals = data.reveals || [];
    const teams = data.teams;
    if (!teams) return;

    const totalPlayers = teams.teamA.length + teams.teamB.length;
    for (let i = 0; i < totalPlayers; i++) {
        if (!reveals[i]) continue;
        const r = reveals[i];
        const side = i < teams.teamA.length ? 'a' : 'b';
        const idx = i < teams.teamA.length ? i : i - teams.teamA.length;
        const key = side + '_' + idx;

        const card = document.querySelector(`.flip-card[data-side="${side}"][data-idx="${idx}"]`);
        if (!card) continue;

        // Flip nếu chưa flip
        if (!card.classList.contains('flipped')) {
            card.classList.add('flipped');
            viewerPlayFlip();
            // Cập nhật champ-reveal text
            const revealEl = card.querySelector('.champ-reveal');
            if (revealEl) revealEl.innerHTML = (r.championWarn ? '⚠️ ' : '') + (r.champion || '?');
        }
    }
}

// ===== Viewer: Slot Machine =====
function viewerRenderSlotMachine(data) {
    const content = $('viewerContent');
    const teams = data.teams;
    const reveals = data.reveals || [];

    const order = [];
    [teams.teamA, teams.teamB].forEach((team, ti) => {
        team.forEach((p, i) => order.push({ ...p, side: ti === 0 ? 'a' : 'b' }));
    });
    viewerCurrentOrder = order;

    content.innerHTML = `
        <div class="slot-area">
            <div class="slot-frame" id="viewerSlotFrame">
                <div class="sf-avatar" id="viewerSfAvatar">🎮</div>
                <div class="sf-name" id="viewerSfName">Sẵn sàng...</div>
                <div class="sf-role" id="viewerSfRole"></div>
                <img class="sf-champ-img" id="viewerSfChampImg" alt="">
                <div class="sf-champ-name" id="viewerSfChampName"></div>
            </div>
            <div class="slot-teams">
                <div class="slot-team">
                    <h4 class="slot-team-title">🔵 ${teams.nameA}${teams.balance?.teamA !== undefined ? ` (${teams.balance.teamA}%)` : ''}</h4>
                    <div class="slot-team-list" id="viewerSlotTeamA"></div>
                </div>
                <div class="slot-team">
                    <h4 class="slot-team-title">🔴 ${teams.nameB}${teams.balance?.teamB !== undefined ? ` (${teams.balance.teamB}%)` : ''}</h4>
                    <div class="slot-team-list" id="viewerSlotTeamB"></div>
                </div>
            </div>
        </div>
    `;

    // Replay reveals đã có
    order.forEach((p, i) => {
        if (reveals[i]) {
            viewerInstantReveal(i, reveals[i]);
        }
    });
}

function viewerUpdateSlotMachine(data) {
    const reveals = data.reveals || [];
    const order = viewerCurrentOrder;

    order.forEach((p, i) => {
        if (reveals[i] && !viewerSpinnersDone.has(i)) {
            // Reveal mới → play animation
            viewerSpinReveal(i, reveals[i]);
        }
    });
}

function viewerInstantReveal(index, revealData) {
    if (viewerSpinnersDone.has(index)) return;
    viewerSpinnersDone.add(index);

    const p = viewerCurrentOrder[index];
    if (!p) return;

    const champImgEl = $('viewerSfChampImg');
    const nameEl = $('viewerSfName');
    const roleEl = $('viewerSfRole');
    const champNameEl = $('viewerSfChampName');
    const avatarEl = $('viewerSfAvatar');

    avatarEl.innerHTML = avatarHtml(p.avatar);
    nameEl.textContent = p.name;
    roleEl.textContent = p.role === 'flex' ? 'Vị trí tự chọn' : ROLE_LABELS[p.role] || p.role;
    champImgEl.src = heroImg(revealData.champion);
    champNameEl.textContent = (revealData.championWarn ? '⚠️ ' : '') + (revealData.champion || '?');

    viewerAppendRow(p, revealData);
}

function viewerSpinReveal(index, revealData) {
    if (viewerSpinnersDone.has(index)) return;
    viewerSpinnersDone.add(index);

    const p = viewerCurrentOrder[index];
    if (!p) return;

    const champImgEl = $('viewerSfChampImg');
    const nameEl = $('viewerSfName');
    const roleEl = $('viewerSfRole');
    const champNameEl = $('viewerSfChampName');
    const avatarEl = $('viewerSfAvatar');

    avatarEl.innerHTML = avatarHtml(p.avatar);
    nameEl.textContent = p.name;
    roleEl.textContent = p.role === 'flex' ? 'Vị trí tự chọn' : ROLE_LABELS[p.role] || p.role;

    const allChamps = HEROES_DATA.map(h => h.name);
    const steps = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 150, 150, 150, 150, 150, 300, 300, 300];
    let stepIdx = 0;

    function tick() {
        if (stepIdx < steps.length) {
            const rnd = allChamps[Math.floor(Math.random() * allChamps.length)];
            champImgEl.src = heroImg(rnd);
            champNameEl.textContent = rnd;
            viewerPlayTick();
            setTimeout(tick, steps[stepIdx]);
            stepIdx++;
        } else {
            champImgEl.src = heroImg(revealData.champion);
            champNameEl.textContent = (revealData.championWarn ? '⚠️ ' : '') + (revealData.champion || '?');
            viewerAppendRow(p, revealData);
        }
    }
    tick();
}

function viewerAppendRow(p, revealData) {
    const row = document.createElement('div');
    row.className = 'sr-row';
    row.innerHTML = `<img src="${heroImg(revealData.champion)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23333%22/></svg>'"><span>${p.name} — ${ROLE_LABELS[p.role] || 'Sub'} → ${revealData.champion || '?'}${revealData.championWarn ? ' ⚠️' : ''}</span>`;
    const listEl = p.side === 'a' ? $('viewerSlotTeamA') : $('viewerSlotTeamB');
    if (listEl) listEl.appendChild(row);
}

// ===== 2. Hằng số =====
const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];
const ROLE_LABELS = {
    top: 'Đường Trên ⚔️', jungle: 'Đi Rừng 🌲', mid: 'Đường Giữa 🔮', adc: 'Xạ Thủ 🏹', support: 'Trợ Thủ 🛡️'
};
const TIER_COLORS = { 1: '#FFD700', 2: '#4ADE80', 3: '#94A3B8', 4: '#60A5FA', 5: '#C084FC' };
const TIER_LABELS = { 1: 'Mâm 1 💪', 2: 'Mâm 2 🙂', 3: 'Mâm 3 🐣', 4: 'Mâm 4 🤡', 5: 'Mâm 5 🗿' };
const DEFAULT_EMOJIS = ['🐸', '🐵', '🦍', '🐔', '🐹', '🦖'];

// Bể tướng theo vị trí (mặc định, user đã tổng hợp — cover đủ 128 tướng)
const DEFAULT_ROLE_CHAMPIONS = {
    top: ["Biron","Mina","Toro","Maloch","Astrid","Wonder Woman","Richter","Florentino","Volkath","Allain","Tachi","Charlotte","Bolt Baron","Airi","Lữ Bố","Triệu Vân","Gildur","Arthur","Murad","Arduin","Ryoma","Superman","Xeniel","Kil'Groth","Omen","Roxie","Amily","Y'bneth","Veres","Yena","Ata","Dextra","Yan","Bijan","Qi","Edras","Tamyn","Omega","Zuka","Marja","Skud","Max","Errol","Taara","Wiro"],
    jungle: ["Butterfly","Nakroth","Astrid","Wonder Woman","Tulen","Volkath","Eland'orr","Keera","Paine","Bright","Aoi","Tachi","Charlotte","Billow","Airi","Triệu Vân","Zephys","Fennik","Ngộ Không","Kriknak","Kaine","Murad","Zill","Ryoma","The Flash","Rourke","Quillen","Sinestrea","Yan","Qi","Zuka","Lindis","Enzo","Thorne","Skud","Errol"],
    mid: ["Ignis","Tulen","Liliana","Sephera","Zata","Lorion","Iggy","Bonnie","Krixi","Kahlii","Điêu Thuyền","Azzen'Ka","Alice","Gildur","Aleister","Ilumia","Raz","Lauriel","The Flash","D'Arcy","Ishar","Yue","Dirak","Flowborn Pháp Sư","Goverra","Heino","Veera","Mganga","Natalya","Jinna","Preyta","Annette"],
    adc: ["Hayate","Capheny","Celica","Eland'orr","Teeri","Erin","Violet","Fennik","Slimz","Stuart","Tel'Annas","Moren","Elsu","Laville","Flowborn","Valhein","Yorn","Lindis","Wisp","Thorne"],
    support: ["Thane","Mina","Toro","TeeMee","Richter","Sephera","Aya","Ming","Dolia","Dyadia","Chaugnar","Ormarr","Alice","Gildur","Grakk","Helen","Arduin","Xeniel","Baldum","Y'bneth","Zip","Krizzix","Ishar","Ata","Omega","Lumburr","Rouie","Cresht","Arum","Annette","Wiro"]
};
const TAGLINES = [
    'Random 5v5 công bằng — hết cãi nhau nha 😤',
    'Đừng có gánh team nữa, để máy lo 🎲',
    'Top 1 gánh còng lưng, top 2 chuyên feed 🔥',
    'Bốc thăm 1 lần, đỡ đau đầu cả tuần 🧠',
    'Cân tier chuẩn chỉnh, ai cũng có cửa carry 💪',
    'May mắn hay định mệnh? Bấm là biết 🎰',
];
const TINH_TU = ['Gánh Còng Lưng', 'Không Biết Sợ', 'Chuyên Feed', 'Bất Tử', 'Toxic Vui Vẻ', 'Cày Cuốc', 'Lụi Bụi', 'Try Hard', 'Thánh AFK', 'Bá Đạo', 'Hack Não', 'Feed Lên Bờ'];
const DANH_TU = ['Liên Minh', 'Đội', 'Biệt Đội', 'Hội', 'Bang', 'CLB'];

// ===== 3. State =====
let state = {
    players: [],
    tierScore: { 1: 8, 2: 4, 3: 2, 4: 1, 5: 0.5 },
    championPool: JSON.parse(JSON.stringify(DEFAULT_ROLE_CHAMPIONS)),
    settings: { teamMode: 'tier', roleMode: 'random', championMode: 'byRole', balanceLevel: '60-40', revealMode: 'secretBox', soundEnabled: true },
    history: []
};

// ===== 4. Helper =====
function rand(n) { return Math.floor(Math.random() * n); }

// Fisher-Yates shuffle
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function uid() { return 'p' + Date.now() + rand(10000); }

function saveState() {
    try { localStorage.setItem('lq_state', JSON.stringify(state)); } catch (e) { alert('⚠️ Không lưu được (bộ nhớ đầy?)'); }
}

function loadState() {
    try {
        const raw = localStorage.getItem('lq_state');
        if (raw) {
            const d = JSON.parse(raw);
            state = Object.assign(state, d);
            state.settings = Object.assign({ teamMode: 'tier', roleMode: 'random', championMode: 'byRole', balanceLevel: '60-40', revealMode: 'secretBox', soundEnabled: true }, d.settings);
            state.championPool = Object.assign(JSON.parse(JSON.stringify(DEFAULT_ROLE_CHAMPIONS)), d.championPool);
            // Nếu bể lưu cũ bị rỗng thì dùng lại mặc định theo vị trí
            if (Object.values(state.championPool).every((p) => p.length === 0)) {
                state.championPool = JSON.parse(JSON.stringify(DEFAULT_ROLE_CHAMPIONS));
            }
            state.tierScore = Object.assign({ 1: 8, 2: 4, 3: 2, 4: 1, 5: 0.5 }, d.tierScore);
        }
    } catch (e) { console.warn('load state fail', e); }
}

// ===== 5. DOM =====
const $ = (id) => document.getElementById(id);
const nameInput = $('nameInput');
const tierSelect = $('tierSelect');
const addBtn = $('addBtn');
const avatarBtn = $('avatarBtn');
const avatarInput = $('avatarInput');
const avatarPreview = $('avatarPreview');
const playerList = $('playerList');
const playerCount = $('playerCount');
const tierScoreGrid = $('tierScoreGrid');
const heroGrid = $('heroGrid');
const heroSearch = $('heroSearch');
const poolWarn = $('poolWarn');
const drawBtn = $('drawBtn');
const redrawBtn = $('redrawBtn');
const resultArea = $('resultArea');
const historyList = $('historyList');

let activeRole = 'top';
let pendingAvatar = null;      // ảnh đang preview trước khi Thêm
let editingAvatarId = null;    // id player đang đổi ảnh
let currentResult = null;      // kết quả đang hiển thị (để copy/lật hết)

// ===== 6. Tier select =====
function renderTierSelect() {
    tierSelect.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const o = document.createElement('option');
        o.value = i;
        o.textContent = TIER_LABELS[i];
        tierSelect.appendChild(o);
    }
}

// ===== 7. Avatar (resize qua canvas) =====
function resizeImage(file, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const size = 200;
            const c = document.createElement('canvas');
            c.width = size; c.height = size;
            const ctx = c.getContext('2d');
            const min = Math.min(img.width, img.height);
            const sx = (img.width - min) / 2;
            const sy = (img.height - min) / 2;
            ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
            cb(c.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => alert('⚠️ Không đọc được ảnh');
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function avatarHtml(avatar) {
    return avatar ? `<img src="${avatar}" alt="">` : `<span style="font-size:16px">${DEFAULT_EMOJIS[rand(DEFAULT_EMOJIS.length)]}</span>`;
}

// ===== 8. Render player list =====
function renderPlayers() {
    playerList.innerHTML = '';
    const activeCount = state.players.filter(p => p.active !== false).length;
    playerCount.textContent = `(${activeCount}/${state.players.length} chơi)`;
    state.players.forEach((p) => {
        const color = TIER_COLORS[p.tier];
        const chip = document.createElement('span');
        chip.className = 'player-chip' + (p.active === false ? ' inactive' : '');
        chip.style.borderColor = color;
        chip.innerHTML = `
            <span class="chip-avatar" data-edit="${p.id}">${avatarHtml(p.avatar)}</span>
            <span class="chip-name">${p.name}</span>
            <span class="chip-tier">${TIER_LABELS[p.tier]}</span>
            <span class="remove" data-del="${p.id}">✕</span>
        `;
        chip.title = p.active === false ? 'Bấm để đánh dấu "đang chơi"' : 'Bấm để tắt (không chơi hôm nay)';
        playerList.appendChild(chip);
    });
    if (typeof updateDrawStatus === 'function') updateDrawStatus();
}

// ===== 9. Render tier score =====
function renderTierScore() {
    tierScoreGrid.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const div = document.createElement('div');
        div.className = 'tier-score-item';
        div.innerHTML = `<label>${TIER_LABELS[i]}</label><input type="number" step="0.5" min="0" data-tier="${i}" value="${state.tierScore[i]}">`;
        tierScoreGrid.appendChild(div);
    }
}

// ===== 10. Render hero grid =====
function renderHeroGrid() {
    const q = heroSearch.value.trim().toLowerCase();
    const selected = state.championPool[activeRole] || [];
    const list = HEROES_DATA.filter(h => !q || h.name.toLowerCase().includes(q));
    heroGrid.innerHTML = '';
    list.forEach((h) => {
        const card = document.createElement('div');
        card.className = 'hero-card' + (selected.includes(h.name) ? ' selected' : '');
        card.innerHTML = `<img src="${h.imgUrl}" alt="${h.name}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23333%22/><text x=%2250%25%22 y=%2255%25%22 fill=%22%23fff%22 font-size=%2230%22 text-anchor=%22middle%22>❓</text></svg>'"><div class="hero-name">${h.name}</div>`;
        card.addEventListener('click', () => toggleHero(h.name));
        heroGrid.appendChild(card);
    });
    // cảnh báo ít hơn 2 tướng
    const count = (state.championPool[activeRole] || []).length;
    poolWarn.hidden = count >= 2;
    $('poolCount').textContent = count;
}

function toggleHero(name) {
    const pool = state.championPool[activeRole] || [];
    const i = pool.indexOf(name);
    if (i >= 0) pool.splice(i, 1); else pool.push(name);
    state.championPool[activeRole] = pool;
    saveState();
    renderHeroGrid();
}

// ===== 11. Settings =====
function renderSettings() {
    document.querySelectorAll('input[name="teamMode"]').forEach(r => r.checked = r.value === state.settings.teamMode);
    document.querySelectorAll('input[name="roleMode"]').forEach(r => r.checked = r.value === (state.settings.roleMode || 'random'));
    document.querySelectorAll('input[name="championMode"]').forEach(r => r.checked = r.value === state.settings.championMode);
    document.querySelectorAll('input[name="balanceLevel"]').forEach(r => r.checked = r.value === state.settings.balanceLevel);
    document.querySelectorAll('input[name="revealMode"]').forEach(r => r.checked = r.value === state.settings.revealMode);
    $('soundToggle').checked = state.settings.soundEnabled;
    $('balanceRow').style.opacity = state.settings.teamMode === 'tier' ? '1' : '0.4';
    $('balanceRow').style.pointerEvents = state.settings.teamMode === 'tier' ? 'auto' : 'none';
}

// ===== 12. Thuật toán chia team =====

// Chia random: Fisher-Yates rồi cắt đôi
function splitRandom(players) {
    const shuffled = shuffle(players);
    const sizeA = Math.floor(players.length / 2);
    return { teamA: shuffled.slice(0, sizeA), teamB: shuffled.slice(sizeA) };
}

// Sinh tổ hợp chọn k phần tử (đệ quy) — dùng cho brute-force cân tier
function generateCombinations(arr, k) {
    const results = [];
    function helper(start, combo) {
        if (combo.length === k) { results.push([...combo]); return; }
        for (let i = start; i <= arr.length - (k - combo.length); i++) {
            combo.push(arr[i]);
            helper(i + 1, combo);
            combo.pop();
        }
    }
    helper(0, []);
    return results;
}

// Chia cân theo tier: brute-force duyệt tổ hợp, lọc theo % sức mạnh
function splitTierBalanced(players) {
    const n = players.length;
    const sizeA = Math.floor(n / 2);
    const power = players.map(p => Number(state.tierScore[p.tier]) || 1);
    const totalPower = power.reduce((s, x) => s + x, 0);
    const combos = generateCombinations(players.map((_, i) => i), sizeA);

    const ranges = { '50-50': [48, 52], '60-40': [40, 60], '70-30': [30, 70] };
    let [lo, hi] = ranges[state.settings.balanceLevel] || [40, 60];

    let candidates = [];
    for (let attempt = 0; attempt <= 3; attempt++) {
        candidates = combos.filter((combo) => {
            const powerA = combo.reduce((s, i) => s + power[i], 0);
            const percentA = (powerA / totalPower) * 100;
            return percentA >= lo && percentA <= hi;
        });
        if (candidates.length) break;
        lo -= 5; hi += 5;
    }

    let comboA, warning = false;
    if (candidates.length) {
        comboA = candidates[rand(candidates.length)];   // random trong nhóm hợp lệ
    } else {
        warning = true;
        let best = null, bestDiff = Infinity;
        for (const combo of combos) {
            const powerA = combo.reduce((s, i) => s + power[i], 0);
            const diff = Math.abs((powerA / totalPower) * 100 - 50);
            if (diff < bestDiff) { bestDiff = diff; best = combo; }
        }
        comboA = best;
    }

    const setA = new Set(comboA);
    const teamA = players.filter((_, i) => setA.has(i));
    const teamB = players.filter((_, i) => !setA.has(i));
    return { teamA, teamB, warning };
}

// ===== 13. Gán vị trí =====
function assignPositions(team) {
    const pos = shuffle(ROLES);
    return team.map((p, i) => ({ ...p, role: i < pos.length ? pos[i] : 'flex' }));
}

// ===== 14. Gán tướng =====
function heroImg(name) {
    const h = HEROES_DATA.find(x => x.name === name);
    return h ? h.imgUrl : '';
}

function assignChampions(teamA, teamB) {
    const mode = state.settings.championMode;
    const fullPool = getFullPool();
    const usedGlobal = new Set();

    function assignTeam(team) {
        const usedInTeam = new Set();
        return team.map((p) => {
            if (mode === 'skip') return { ...p, champion: null, championWarn: false };  // không bốc tướng
            let pool;
            if (p.role === 'flex' || mode === 'full') pool = fullPool;
            else pool = (state.championPool[p.role] && state.championPool[p.role].length) ? state.championPool[p.role] : fullPool;
            if (!pool.length) pool = fullPool;
            if (!pool.length) return { ...p, champion: null, championWarn: true };

            let candidates = pool.filter(c => !usedGlobal.has(c));
            let warn = false;
            if (!candidates.length) {
                candidates = pool.filter(c => !usedInTeam.has(c));
                warn = true;
                if (!candidates.length) candidates = pool;
            }
            const champ = candidates[rand(candidates.length)];
            usedGlobal.add(champ);
            usedInTeam.add(champ);
            return { ...p, champion: champ, championWarn: warn };
        });
    }
    return [assignTeam(teamA), assignTeam(teamB)];
}

// ===== 15. Sinh tên team =====
function generateTeamNames() {
    function gen() { return DANH_TU[rand(DANH_TU.length)] + ' ' + TINH_TU[rand(TINH_TU.length)]; }
    const a = gen();
    let b = gen();
    while (b === a) b = gen();
    return [a, b];
}

// ===== 16. Âm thanh (Web Audio API) =====
let audioCtx = null;
function ensureAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function beep(freq, dur, type) {
    if (!state.settings.soundEnabled) return;
    try {
        ensureAudio();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type || 'square';
        o.frequency.value = freq || 440;
        g.gain.value = 0.06;
        o.connect(g); g.connect(audioCtx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        o.stop(audioCtx.currentTime + dur);
    } catch (e) {}
}

// Tiếng "tạch" kiểu quay số (nhiễu trắng ngắn)
function playNoise(dur, vol) {
    if (!state.settings.soundEnabled) return;
    try {
        ensureAudio();
        const len = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
        const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.value = vol || 0.1;
        src.connect(gain); gain.connect(audioCtx.destination);
        src.start();
    } catch (e) {}
}

function playTick() {} // không dùng beep tách riêng nữa (chỉ nhạc xổ số cho đỡ điếc)
function playFlip() { beep(620, 0.08, 'triangle'); }
// Nhạc "tada" kiểu trúng số: dồn dập rồi lên nốt cao
function playTada() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'triangle'), i * 110)); }
// Tiếng "bị loại" (nốt tụt xuống - buồn)
function playEliminated() { [440, 349, 262].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'sawtooth'), i * 120)); }

// Nhạc xổ số (file mp3 user cung cấp)
function playSpinMusic() {
    if (!state.settings.soundEnabled) return;
    try { const m = $('spinMusic'); m.currentTime = 0; m.play().catch(() => {}); } catch (e) {}
}
function stopSpinMusic() {
    try { const m = $('spinMusic'); m.pause(); m.currentTime = 0; } catch (e) {}
}

// ===== 17. Draw =====
// Bể tướng gộp: nếu chưa chọn bể theo vị trí thì dùng TOÀN BỘ tướng (fix cứng)
function getFullPool() {
    const merged = [...new Set(Object.values(state.championPool).flat())];
    return merged.length ? merged : HEROES_DATA.map((h) => h.name);
}

function draw() {
    ensureAudio();
    resetPickedMarks();
    const active = state.players.filter(p => p.active !== false);
    if (active.length < 10) {
        alert(`Cần đúng 10 người đang chơi (5v5), hiện có ${active.length} người! Thiếu ${10 - active.length} người.`);
        return;
    }
    if (active.length > 10) {
        alert(`Còn ${active.length} người đang chơi (dư ${active.length - 10}) — bấm nút "🎯 Chọn 10 người chơi" trên khung thêm chiến hữu để loại bớt trước đã! 😅`);
        return;
    }
    doDraw(active);
}

// Loại người xuống còn 10 khi có > 10 người muốn chơi (troll số phận)
// Mỗi vòng loại 1 người, nhưng NHÃN đan xen: lượt 1 "😭 OUT", lượt 2 "✅ CHƠI"...
function startElimination(players) {
    const elimModal = $('elimModal');
    elimModal.classList.remove('hidden');
    $('elimCount').textContent = players.length;
    $('elimNeed').textContent = players.length - 10;
    playSpinMusic();

    let remaining = [...players];
    let round = 0;
    let committed = false;   // đã ghi state khi loại đủ chưa
    let eliminated = [];   // người bị loại
    let picked = [];       // người được xác nhận chơi

    function renderElim() {
        $('elimGrid').innerHTML = [...remaining, ...eliminated, ...picked].map(p => `
            <div class="elim-card${p.out ? ' eliminated' : ''}${p.picked ? ' selected-mark' : ''}" data-id="${p.id}">
                ${p.out ? '<span class="out-mark">😭 OUT</span>' : ''}<span class="elim-avatar">${avatarHtml(p.avatar)}</span><span>${p.name}</span>${p.picked ? '<span class="picked-mark">✅ CHƠI</span>' : ''}
            </div>
        `).join('');
    }
    renderElim();

    // GHI NGƯỜI CHƠI CUỐI vào state.players (người bị loại => active=false)
    function commitSelection() {
        const keepIds = new Set([...picked, ...remaining].map(p => p.id));
        state.players.forEach((p) => {
            p.active = keepIds.has(p.id);
            delete p.out;
            delete p.picked;
        });
        saveState();
        renderPlayers();
    }
    // Ghi NGAY khi hiệu ứng loại đủ người (không phụ thuộc nút cuối)
    function commitIfDone() {
        if (remaining.length + picked.length <= 10 && !committed) {
            committed = true;
            stopSpinMusic();
            commitSelection();
        }
    }

    function eliminateNext() {
        // dừng khi số người sẽ chơi (còn lại + được xác nhận) đủ 10
        if (remaining.length + picked.length <= 10) {
            stopSpinMusic();
            playTada();
            commitIfDone();
            $('elimDoneBtn').hidden = false;
            return;
        }
        const cards = [...$('elimGrid').children];
        const isElimRound = (round % 2 === 0);  // lượt chẵn = loại, lẻ = được chơi
        let step = 0;
        const total = 22;

        function spin() {
            if (step >= total) {
                const victim = remaining[rand(remaining.length)];
                const victimEl = cards.find(c => c.dataset.id === victim.id);
                if (isElimRound) {
                    victim.out = true;
                    eliminated.push(victim);
                    if (victimEl) victimEl.classList.add('eliminated');
                    playEliminated();
                } else {
                    victim.picked = true;
                    picked.push(victim);
                    if (victimEl) victimEl.classList.add('selected-mark');
                    playTada();
                }
                remaining = remaining.filter(p => p.id !== victim.id);
                round++;
                setTimeout(() => { renderElim(); setTimeout(eliminateNext, 900); }, 1200);
                return;
            }
            const cards2 = [...$('elimGrid').children].filter(c => !c.classList.contains('eliminated') && !c.classList.contains('selected-mark'));
            cards2.forEach(c => c.classList.remove('highlight'));
            cards2[rand(cards2.length)].classList.add('highlight');
            step++;
            setTimeout(spin, 70 + step * 14);
        }
        spin();
    }

    $('elimDoneBtn').onclick = () => {
        commitIfDone();  // đảm bảo đã ghi state
        elimModal.classList.add('hidden');
        doDraw([...picked, ...remaining]);
    };

    // Nếu người dùng đóng modal thoát early — vẫn ghi state nếu đã loại đủ
    $('elimModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            commitIfDone();
            elimModal.classList.add('hidden');
            if (committed) $('elimDoneBtn').onclick = null;
        }
    });

    eliminateNext();
}

function doDraw(players) {
    const s = state.settings;
    let split;
    if (s.teamMode === 'random') split = splitRandom(players);
    else split = splitTierBalanced(players);

    // tôn trọng chế độ gán vị trí: 'skip' = ai cũng "Tự chọn lane"
    const assignPos = (team) => state.settings.roleMode === 'skip'
        ? team.map((p) => ({ ...p, role: 'flex' }))
        : assignPositions(team);

    let teamA = assignPos(split.teamA);
    let teamB = assignPos(split.teamB);
    const [a2, b2] = assignChampions(teamA, teamB);
    teamA = a2; teamB = b2;

    const [nameA, nameB] = generateTeamNames();

    const balance = {};
    if (s.teamMode === 'tier') {
        const pA = teamA.reduce((sum, p) => sum + (Number(state.tierScore[p.tier]) || 1), 0);
        const pB = teamB.reduce((sum, p) => sum + (Number(state.tierScore[p.tier]) || 1), 0);
        const tot = pA + pB;
        balance.teamA = Math.round((pA / tot) * 100);
        balance.teamB = Math.round((pB / tot) * 100);
    }

    currentResult = { teamA, teamB, nameA, nameB, balance, warning: split.warning };

    // Live sync: push teams lên Firebase
    if (isHost && currentSessionId) {
        syncTeams(currentResult);
    }

    // lưu kết quả vào localStorage (session — F5 không mất)
    try { localStorage.setItem('lq_lastResult', JSON.stringify(currentResult)); } catch (e) {}

    // chế độ "không bốc tướng" → không cần slot quay, luôn dùng Hộp Bí Ẩn (cho gọn)
    if (s.revealMode === 'secretBox' || s.championMode === 'skip') renderSecretBox();
    else renderSlotMachine();
}

// ===== 18. Render Hộp Bí Ẩn =====
function renderSecretBox() {
    const r = currentResult;
    resultArea.hidden = false;
    resultArea.innerHTML = `
        <div class="teams-grid">
            ${teamColumnSecretBox(r.teamA, r.nameA, r.balance.teamA, 'a')}
            <div class="team-vs">VS</div>
            ${teamColumnSecretBox(r.teamB, r.nameB, r.balance.teamB, 'b')}
        </div>
        ${actionBar()}
    `;
    if (r.warning) alert('⚠️ Dữ liệu quá lệch, đã lấy phương án cân nhất có thể');
}

function teamColumnSecretBox(team, name, percent, side) {
    const cards = team.map((p) => `
        <div class="flip-card" data-side="${side}" data-idx="${team.indexOf(p)}">
            <div class="card-left">
                <span class="f-avatar">${avatarHtml(p.avatar)}</span>
            </div>
            <div class="flip-zone">
                <div class="flip-inner">
                    <div class="flip-face flip-front">
                        <span class="f-question">?</span>
                    </div>
                    <div class="flip-face flip-back">
                        ${p.champion ? `<img class="f-champ-img" src="${heroImg(p.champion)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23333%22/><text x=%2250%25%22 y=%2255%25%22 fill=%22%23fff%22 font-size=%2230%22 text-anchor=%22middle%22>❓</text></svg>'">` : `<span class="f-champ-free">🖐</span>`}
                    </div>
                </div>
            </div>
            <div class="card-info">
                <span class="f-name">${p.name}</span>
                <span class="f-role">${p.role === 'flex' ? 'Vị trí tự chọn' : ROLE_LABELS[p.role]}</span>
                <span class="f-champ-name">${p.champion ? (p.championWarn ? '⚠️ ' : '') + '<span class="champ-reveal">???</span>' : 'Tự chọn tướng'}</span>
            </div>
            ${p.champion ? `<span class="champ-hidden-text hidden">${p.champion}${p.championWarn ? ' ⚠️' : ''}</span>` : ''}
        </div>
    `).join('');
    return `<div class="team-col">
        <h3>${side === 'a' ? '🔵' : '🔴'} ${name}</h3>
        ${percent !== undefined ? `<div class="team-percent">💪 ${percent}% sức mạnh</div>` : ''}
        <div class="box-grid">${cards}</div>
    </div>`;
}

// ===== 19. Render Vòng Quay Số Phận =====
function renderSlotMachine() {
    const r = currentResult;
    resultArea.hidden = false;
    // Thứ tự quay: team A theo top→support, rồi team B
    const order = [];
    [r.teamA, r.teamB].forEach((team, ti) => {
        team.forEach((p) => order.push({ ...p, side: ti === 0 ? 'a' : 'b' }));
    });
    resultArea.innerHTML = `
        <div class="slot-area">
            <div class="slot-frame" id="slotFrame">
                <div class="sf-avatar" id="sfAvatar"></div>
                <div class="sf-name" id="sfName">Sẵn sàng...</div>
                <div class="sf-role" id="sfRole"></div>
                <img class="sf-champ-img" id="sfChampImg" alt="">
                <div class="sf-champ-name" id="sfChampName"></div>
            </div>
            <div class="slot-teams">
                <div class="slot-team">
                    <h4 class="slot-team-title">🔵 ${r.nameA}${r.balance.teamA !== undefined ? ` (${r.balance.teamA}%)` : ''}</h4>
                    <div class="slot-team-list" id="slotTeamA"></div>
                </div>
                <div class="slot-team">
                    <h4 class="slot-team-title">🔴 ${r.nameB}${r.balance.teamB !== undefined ? ` (${r.balance.teamB}%)` : ''}</h4>
                    <div class="slot-team-list" id="slotTeamB"></div>
                </div>
            </div>
            ${actionBar()}
            <button class="redraw-btn" id="skipBtn" type="button">⏩ Bỏ qua hiệu ứng, hiện hết ngay</button>
        </div>
    `;
    const skipBtn = $('skipBtn');
    let skipped = false;
    let finished = false;
    const appended = new Set();

    const showFrame = (p) => {
        $('sfAvatar').innerHTML = avatarHtml(p.avatar);
        $('sfName').textContent = p.name;
        $('sfRole').textContent = (p.role === 'flex' ? 'Vị trí tự chọn' : ROLE_LABELS[p.role]);
    };

    const appendRow = (p) => {
        if (appended.has(p)) return;
        appended.add(p);
        const row = document.createElement('div');
        row.className = 'sr-row';
        row.innerHTML = `<img src="${heroImg(p.champion)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23333%22/></svg>'"><span>${p.name} — ${ROLE_LABELS[p.role] || 'Sub'} → ${p.champion || '?'}${p.championWarn ? ' ⚠️' : ''}</span>`;
        (p.side === 'a' ? $('slotTeamA') : $('slotTeamB')).appendChild(row);
    };

    // Vòng quay 1 người: setTimeout đệ quy, tốc độ giảm dần
    function spinOne(p, pool, done) {
        showFrame(p);
        const steps = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 150, 150, 150, 150, 150, 300, 300, 300];
        let stepIdx = 0;
        const champImgEl = $('sfChampImg');
        function tick() {
            if (skipped) { champImgEl.src = heroImg(p.champion); $('sfChampName').textContent = p.champion + (p.championWarn ? ' ⚠️' : ''); done(); return; }
            if (stepIdx < steps.length) {
                const rnd = pool[rand(pool.length)];
                champImgEl.src = heroImg(rnd);
                $('sfChampName').textContent = rnd;
                playTick();
                const delay = steps[stepIdx];
                stepIdx++;
                setTimeout(tick, delay);
            } else {
                champImgEl.src = heroImg(p.champion);
                $('sfChampName').textContent = p.champion + (p.championWarn ? ' ⚠️' : '');
                done();
            }
        }
        tick();
    }

    // pool cho từng người
    const fullPool = getFullPool();
    function poolFor(p) {
        if (p.role === 'flex' || state.settings.championMode === 'full') return fullPool;
        return (state.championPool[p.role] && state.championPool[p.role].length) ? state.championPool[p.role] : fullPool;
    }

    function run(i) {
        if (skipped) return;
        if (i >= order.length) { finish(); return; }
        const p = order[i];
        spinOne(p, poolFor(p), () => {
            appendRow(p);
            // Live sync: push reveal lên Firebase
            if (isHost && currentSessionId) {
                syncReveal(order.indexOf(p), {
                    name: p.name,
                    role: p.role,
                    champion: p.champion,
                    championWarn: p.championWarn,
                    side: p.side
                });
            }
            setTimeout(() => run(i + 1), 500);
        });
    }

    function finish() {
        if (finished) return;
        finished = true;
        stopSpinMusic();
        fireConfetti();
        playTada();
        saveHistory();
    }

    skipBtn.addEventListener('click', () => {
        if (skipped || finished) return;
        skipped = true;
        // hiện hết phần còn lại ngay + sync Firebase
        for (let i = 0; i < order.length; i++) {
            const p = order[i];
            appendRow(p);
            if (isHost && currentSessionId) {
                syncReveal(i, {
                    name: p.name, role: p.role, champion: p.champion,
                    championWarn: p.championWarn, side: p.side
                });
            }
        }
        finish();
    });

    playSpinMusic();
    run(0);
}

function actionBar() {
    return `<div class="action-bar">
        <button id="copyBtn" type="button">📋 Copy kết quả</button>
        <button id="revealAllBtn" type="button">👁️ Lật tất cả</button>
    </div>`;
}

// ===== 20. Fire confetti (canvas-confetti CDN) =====
function fireConfetti() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
}

// ===== 21. Copy kết quả =====
function buildCopyText() {
    const r = currentResult;
    if (!r) return '';
    const lines = [];
    lines.push(`🎲 KẾT QUẢ BỐC TEAM`);
    lines.push('');
    lines.push(`🔵 ${r.nameA}${r.balance.teamA !== undefined ? ` (${r.balance.teamA}%)` : ''}`);
    r.teamA.forEach((p, i) => lines.push(`${i + 1}. ${p.name} — ${p.role === 'flex' ? 'Vị trí tự chọn' : ROLE_LABELS[p.role]} → ${p.champion || '?'}${p.championWarn ? ' ⚠️' : ''}`));
    lines.push('');
    lines.push(`🔴 ${r.nameB}${r.balance.teamB !== undefined ? ` (${r.balance.teamB}%)` : ''}`);
    r.teamB.forEach((p, i) => lines.push(`${i + 1}. ${p.name} — ${p.role === 'flex' ? 'Vị trí tự chọn' : ROLE_LABELS[p.role]} → ${p.champion || '?'}${p.championWarn ? ' ⚠️' : ''}`));
    return lines.join('\n');
}

// ===== 22. Lịch sử =====
function saveHistory() {
    const r = currentResult;
    if (!r) return;
    const item = {
        timestamp: new Date().toISOString(),
        teamAName: r.nameA,
        teamBName: r.nameB,
        teamA: r.teamA.map(p => ({ name: p.name, avatar: p.avatar, tier: p.tier, role: p.role, champion: p.champion, championWarn: p.championWarn })),
        teamB: r.teamB.map(p => ({ name: p.name, avatar: p.avatar, tier: p.tier, role: p.role, champion: p.champion, championWarn: p.championWarn })),
        balancePercent: r.balance
    };
    state.history.unshift(item);
    if (state.history.length > 10) state.history = state.history.slice(0, 10);
    saveState();
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    if (!state.history.length) { historyList.innerHTML = '<p style="color:var(--muted);font-size:13px">Chưa có lần bốc nào.</p>'; return; }
    state.history.forEach((h, i) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="hi-info">
                <div class="hi-teams">🔵 ${h.teamAName} vs 🔴 ${h.teamBName}</div>
                <div class="hi-time">${new Date(h.timestamp).toLocaleString('vi-VN')}</div>
            </div>
            <button data-view="${i}">Xem lại</button>
            <button data-del="${i}">✕</button>
        `;
        historyList.appendChild(div);
    });
}

function showHistoryModal(i) {
    const h = state.history[i];
    $('modalTitle').textContent = `🔵 ${h.teamAName} vs 🔴 ${h.teamBName}`;
    let html = '';
    [['🔵 ' + h.teamAName, h.teamA], ['🔴 ' + h.teamBName, h.teamB]].forEach(([t, team]) => {
        html += `<p style="font-weight:700;margin:8px 0 4px">${t}${h.balancePercent && h.balancePercent.teamA !== undefined ? '' : ''}</p>`;
        team.forEach((p, idx) => {
            html += `<div style="font-size:13px;padding:3px 0">${idx + 1}. ${p.name} — ${p.role === 'flex' ? 'Vị trí tự chọn' : ROLE_LABELS[p.role]} → ${p.champion || '?'}${p.championWarn ? ' ⚠️' : ''}</div>`;
        });
    });
    $('modalBody').innerHTML = html;
    $('historyModal').classList.remove('hidden');
}

// ===== 23. Export / Import =====
function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'boc-team-backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!confirm('📥 Nhập dữ liệu sẽ THAY THẾ toàn bộ dữ liệu hiện tại, tiếp tục?')) return;
            state = Object.assign(state, data);
            state.settings = Object.assign(state.settings, data.settings);
            state.championPool = Object.assign({ top: [], jungle: [], mid: [], adc: [], support: [] }, data.championPool);
            state.tierScore = Object.assign({ 1: 8, 2: 4, 3: 2, 4: 1, 5: 0.5 }, data.tierScore);
            state.players = data.players || [];
            state.history = data.history || [];
            saveState();
            location.reload();
        } catch (err) {
            alert('⚠️ File JSON không hợp lệ!');
        }
    };
    reader.readAsText(file);
}

// ===== 24. Sự kiện =====
addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) { alert('Nhập tên đã!'); return; }
    if (state.players.length >= 30) { alert('Tối đa 30 thành viên thôi! 😅'); return; }
    state.players.push({ id: uid(), name, tier: Number(tierSelect.value), avatar: pendingAvatar, active: true });
    pendingAvatar = null;
    avatarPreview.innerHTML = '😀';
    nameInput.value = '';
    saveState();
    renderPlayers();
});

nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });

avatarBtn.addEventListener('click', () => { editingAvatarId = null; avatarInput.click(); });
avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    resizeImage(file, (base64) => {
        if (editingAvatarId) {
            const p = state.players.find(x => x.id === editingAvatarId);
            if (p) { p.avatar = base64; saveState(); renderPlayers(); editingAvatarId = null; }
        } else {
            pendingAvatar = base64;
            avatarPreview.innerHTML = `<img src="${base64}" alt="">`;
        }
    });
    e.target.value = '';
});

playerList.addEventListener('click', (e) => {
    if (e.target.dataset.del) {
        state.players = state.players.filter(p => p.id !== e.target.dataset.del);
        saveState(); renderPlayers();
    } else if (e.target.closest('[data-edit]')) {
        editingAvatarId = e.target.closest('[data-edit]').dataset.edit;
        avatarInput.click();
    } else if (e.target.closest('.player-chip')) {
        // bấm vào chip (không phải avatar/X) -> toggle đang chơi / nghỉ
        const id = e.target.closest('.player-chip').querySelector('[data-edit]').dataset.edit;
        const p = state.players.find(x => x.id === id);
        if (p) { p.active = p.active === false; saveState(); renderPlayers(); }
    }
});

// Tier score
tierScoreGrid.addEventListener('input', (e) => {
    const tier = e.target.dataset.tier;
    if (tier) { state.tierScore[tier] = Number(e.target.value) || 0; saveState(); }
});
$('tierScoreToggle').addEventListener('click', () => {
    const g = tierScoreGrid;
    g.hidden = !g.hidden;
    document.querySelector('.chev').style.transform = g.hidden ? 'rotate(0)' : 'rotate(180deg)';
});

// Settings
document.querySelectorAll('input[name="teamMode"]').forEach(r => r.addEventListener('change', () => { state.settings.teamMode = r.value; saveState(); renderSettings(); }));
document.querySelectorAll('input[name="roleMode"]').forEach(r => r.addEventListener('change', () => { state.settings.roleMode = r.value; saveState(); }));
document.querySelectorAll('input[name="championMode"]').forEach(r => r.addEventListener('change', () => { state.settings.championMode = r.value; saveState(); }));
document.querySelectorAll('input[name="balanceLevel"]').forEach(r => r.addEventListener('change', () => { state.settings.balanceLevel = r.value; saveState(); }));
document.querySelectorAll('input[name="revealMode"]').forEach(r => r.addEventListener('change', () => { state.settings.revealMode = r.value; saveState(); }));
$('soundToggle').addEventListener('change', () => { state.settings.soundEnabled = $('soundToggle').checked; saveState(); });

// Hero tabs + search
document.querySelectorAll('.role-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeRole = tab.dataset.role;
    renderHeroGrid();
}));
heroSearch.addEventListener('input', renderHeroGrid);

// Reset bể tướng về mặc định
$('resetPoolBtn').addEventListener('click', () => {
    if (!confirm('Khôi phục bể tướng về mặc định (danh sách đã tổng hợp)?')) return;
    state.championPool = JSON.parse(JSON.stringify(DEFAULT_ROLE_CHAMPIONS));
    saveState();
    renderHeroGrid();
});

// Nút chọn 10 người chơi (chạy hiệu ứng loại/chọn trước, tiện hơn đợi lúc bấm Bốc thăm)
$('pickTenBtn').addEventListener('click', () => {
    ensureAudio();
    resetPickedMarks();
    const active = state.players.filter(p => p.active !== false);
    if (active.length < 10) { alert(`Cần ít nhất 10 người đang chơi, hiện có ${active.length}!`); return; }
    if (active.length === 10) { alert('Đang có đúng 10 người rồi, bấm BỐC THĂM thẳng luôn nha! 😆'); return; }
    startElimination(active);
});

// Xoá dấu OUT / ✅ CHƠI cũ trước khi bắt đầu vòng mới
function resetPickedMarks() {
    state.players.forEach(p => { delete p.out; delete p.picked; });
}

// Draw
drawBtn.addEventListener('click', () => {
    // đã có kết quả hiện trên màn thì xác nhận trước khi bốc lại (tránh bấm nhầm mất kết quả)
    if (currentResult && !confirm('Kết quả hiện tại sẽ bị thay bằng lượt bốc mới, tiếp tục? 🎲')) return;
    draw();
});
redrawBtn.addEventListener('click', () => {
    if (currentResult && !confirm('Bốc lại toàn bộ? Kết quả hiện tại sẽ thay đổi 🔄')) return;
    draw();
});

// Result actions (event delegation)
resultArea.addEventListener('click', (e) => {
    if (e.target.id === 'copyBtn') {
        navigator.clipboard.writeText(buildCopyText()).then(() => alert('📋 Đã copy!')).catch(() => alert('Không copy được'));
    } else if (e.target.id === 'revealAllBtn') {
        document.querySelectorAll('.flip-card').forEach(c => {
            if (!c.classList.contains('flipped')) {
                c.classList.add('flipped');
                revealChampName(c);
                playFlip();
                // Live sync: push reveal cho từng card
                if (isHost && currentSessionId) {
                    const side = c.dataset.side;
                    const idx = parseInt(c.dataset.idx);
                    const team = side === 'a' ? currentResult.teamA : currentResult.teamB;
                    const p = team[idx];
                    if (p) {
                        const globalIdx = side === 'a' ? idx : idx + currentResult.teamA.length;
                        syncReveal(globalIdx, {
                            name: p.name, role: p.role, champion: p.champion,
                            championWarn: p.championWarn, side: side
                        });
                    }
                }
            }
        });
    } else if (e.target.closest('.flip-card')) {
        const card = e.target.closest('.flip-card');
        if (card.classList.contains('flipped')) return;
        card.classList.add('flipped');
        revealChampName(card);
        playFlip();

        // Live sync: push reveal khi lật thẻ
        if (isHost && currentSessionId) {
            const side = card.dataset.side;
            const idx = parseInt(card.dataset.idx);
            const team = side === 'a' ? currentResult.teamA : currentResult.teamB;
            const p = team[idx];
            if (p) {
                const globalIdx = side === 'a' ? idx : idx + currentResult.teamA.length;
                syncReveal(globalIdx, {
                    name: p.name, role: p.role, champion: p.champion,
                    championWarn: p.championWarn, side: side
                });
            }
        }

        const total = document.querySelectorAll('.flip-card').length;
        const flipped = document.querySelectorAll('.flip-card.flipped').length;
        if (flipped === total) { fireConfetti(); playTada(); saveHistory(); }
    }
});

// Lật thẻ: hiện luôn tên tướng (thay dấu ??? trong dòng info)
function revealChampName(card) {
    const hidden = card.querySelector('.champ-hidden-text');
    const revealEl = card.querySelector('.champ-reveal');
    if (hidden && revealEl) revealEl.innerHTML = hidden.innerHTML;
}

// History
historyList.addEventListener('click', (e) => {
    if (e.target.dataset.view !== undefined) showHistoryModal(Number(e.target.dataset.view));
    else if (e.target.dataset.del !== undefined) {
        state.history.splice(Number(e.target.dataset.del), 1);
        saveState(); renderHistory();
    }
});
$('clearHistory').addEventListener('click', () => { state.history = []; saveState(); renderHistory(); });

// Export/import
$('exportBtn').addEventListener('click', exportData);
$('exportMembersBtn').addEventListener('click', exportMembers);
$('importBtn').addEventListener('click', () => $('importInput').click());
$('importInput').addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });

// Modal
$('modalClose').addEventListener('click', () => $('historyModal').classList.add('hidden'));
$('historyModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) $('historyModal').classList.add('hidden'); });

// ===== Live Share events =====
$('goLiveBtn').addEventListener('click', async () => {
    const active = state.players.filter(p => p.active !== false);
    if (active.length !== 10) {
        alert('Cần đúng 10 người chơi để tạo phiên live!');
        return;
    }
    if (currentSessionId) {
        alert('Đang có phiên live active. Kết thúc phiên cũ trước!');
        return;
    }

    $('goLiveBtn').disabled = true;
    $('goLiveBtn').textContent = '⏳ Đang tạo...';

    const sessionId = await createLiveSession();
    if (!sessionId) {
        $('goLiveBtn').disabled = false;
        $('goLiveBtn').textContent = '🔴 Tạo phiên Live';
        return;
    }

    // Hiện link share
    const link = window.location.origin + window.location.pathname + '?live=' + sessionId;
    $('liveLinkText').textContent = link;
    $('liveLinkInput').value = link;
    $('liveStatus').hidden = false;
    $('goLiveBtn').hidden = true;
    $('liveModal').classList.remove('hidden');
});

$('copyLiveLink').addEventListener('click', () => {
    const link = $('liveLinkInput').value;
    navigator.clipboard.writeText(link).then(() => alert('📋 Đã copy link!')).catch(() => {
        $('liveLinkInput').select();
        document.execCommand('copy');
        alert('📋 Đã copy!');
    });
});

$('copyLiveLinkBtn').addEventListener('click', () => {
    const link = $('liveLinkInput').value;
    navigator.clipboard.writeText(link).then(() => alert('📋 Đã copy link!')).catch(() => {
        $('liveLinkInput').select();
        document.execCommand('copy');
        alert('📋 Đã copy!');
    });
});

$('liveModalClose').addEventListener('click', () => $('liveModal').classList.add('hidden'));
$('liveModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) $('liveModal').classList.add('hidden'); });

$('stopLiveBtn').addEventListener('click', () => {
    if (!confirm('Kết thúc phiên live? Người xem sẽ không thấy gì thêm.')) return;
    endLiveSession();
    $('liveStatus').hidden = true;
    $('goLiveBtn').hidden = false;
    $('goLiveBtn').disabled = false;
    $('goLiveBtn').textContent = '🔴 Tạo phiên Live';
});

// ===== 25. Init =====
// ===== Xuất members.json (chỉ phần thành viên: tên + tier + avatar) =====
function exportMembers() {
    const data = JSON.stringify(state.players, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Nạp thành viên mặc định từ data/members.json (khi localStorage chưa có dữ liệu)
// Lưu ý: trên GitHub Pages chạy OK; khi mở file:// trình duyệt có thể chặn fetch → im lặng dùng fallback
async function loadDefaultMembers() {
    if (localStorage.getItem('lq_state')) return; // đã có data riêng của người đang dùng
    if (state.players.length > 0) return;
    try {
        const res = await fetch('data/members.json');
        if (!res.ok) return;
        const members = await res.json();
        if (Array.isArray(members) && members.length) {
            state.players = members;
            saveState();
            renderPlayers();
        }
    } catch (e) { /* bỏ qua — mở local file thường bị chặn */ }
}

// Cập nhật dòng trạng thái trước nút bốc thăm:多少人 đang chơi + đủ/chưa
function updateDrawStatus() {
    const active = state.players.filter(p => p.active !== false);
    const el = $('drawStatus');
    if (active.length === 10) {
        el.textContent = `✅ Đã đủ 10 người chơi — bấm BỐC THĂM!`;
        el.style.color = '#4ade80';
    } else if (active.length < 10) {
        el.textContent = `Đang có ${active.length} người chơi — thiếu ${10 - active.length} (bấm chip để bật người)`;
        el.style.color = '#fbbf24';
    } else {
        el.textContent = `Đang có ${active.length} người chơi — dư ${active.length - 10} (bấm "🎯 Chọn 10 người chơi" ở trên)`;
        el.style.color = '#f87171';
    }
    // nút bốc thăm chỉ sáng khi đủ
    drawBtn.disabled = active.length !== 10;
}

// Nút nạp lại data gốc từ repo
$('reloadDataBtn').addEventListener('click', () => {
    if (!confirm('Tải lại data gốc từ repo (members.json)? Dữ liệu hiện tại trên trình duyệt này sẽ bị thay!')) return;
    localStorage.removeItem('lq_state');
    localStorage.removeItem('lq_lastResult');
    fetch('data/members.json')
        .then((r) => r.json())
        .then((members) => {
            state.players = Array.isArray(members) ? members : [];
            state.history = [];
            saveState();
            location.reload();
        })
        .catch(() => location.reload());
});

function init() {
    // Kiểm tra URL có ?live= không → vào viewer mode
    const params = new URLSearchParams(window.location.search);
    const liveId = params.get('live');
    if (liveId) {
        joinLiveSession(liveId);
        return;  // không cần init UI host
    }

    loadState();
    $('tagline').textContent = TAGLINES[rand(TAGLINES.length)];
    renderTierSelect();
    renderPlayers();
    renderTierScore();
    renderHeroGrid();
    renderSettings();
    renderHistory();
    loadDefaultMembers();

    updateDrawStatus();
    if (localStorage.getItem('lq_state')) $('reloadDataBtn').hidden = false;

    try { sessionStorage.setItem('lq_lastResult', localStorage.getItem('lq_lastResult') || ''); } catch (e) {}
}

// Setup admin key
$('setupAdminKey').addEventListener('click', (e) => {
    e.preventDefault();
    initialSetupAdminKey();
});

// Đổi admin key
$('changeAdminKey').addEventListener('click', (e) => {
    e.preventDefault();
    if (!isAdminSetup()) {
        alert('Chưa setup admin key. Hãy bấm "Setup admin key" trước.');
        return;
    }
    const oldKey = prompt('Nhập admin key cũ:');
    if (!oldKey || !verifyAdminKey(oldKey)) {
        alert('❌ Sai admin key!');
        return;
    }
    const newKey = prompt('Nhập admin key mới (ít nhất 4 ký tự):');
    if (!newKey || newKey.length < 4) {
        alert('Admin key phải ít nhất 4 ký tự!');
        return;
    }
    const confirmKey = prompt('Xác nhận admin key mới:');
    if (confirmKey !== newKey) {
        alert('❌ Không khớp!');
        return;
    }
    changeAdminKey(oldKey, newKey);
    alert('✅ Đổi admin key thành công!');
});

// Cleanup: xóa phiên live khi host đóng trang
window.addEventListener('beforeunload', () => {
    if (isHost && currentSessionId) {
        endLiveSession();
    }
});

init();
