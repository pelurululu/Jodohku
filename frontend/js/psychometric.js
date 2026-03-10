// ══════════ QUESTION BANK (300 questions, 30 shown randomly each session) ══════════
const PSY_BANK = [
  // — KEWANGAN (Finance) —
  { id:'k1',  dim:'kewangan',    weight:.05, title:'💰 Kewangan & Tanggungjawab',   q:'Anda baru terima bonus RM10,000. Tindakan pertama?', opts:['Simpan terus dalam ASB/FD','Bahagi: 50% simpan, 30% labur, 20% keluarga','Belanjakan untuk pengalaman bersama tersayang','Bayar semua hutang dahulu'], scores:[7,9,6,8] },
  { id:'k2',  dim:'kewangan',    weight:.05, title:'💰 Tabiat Berbelanja',           q:'Cara anda berbelanja untuk barangan besar (kereta, rumah)?', opts:['Kumpul cash dulu, bayar terus','Pinjaman bank dengan kadar faedah terbaik','Beli secara ansuran walaupun ada cash','Berbincang dengan pasangan dulu'], scores:[8,8,6,9] },
  { id:'k3',  dim:'kewangan',    weight:.04, title:'💰 Simpanan Kecemasan',          q:'Berapa bulan perbelanjaan yang anda simpan sebagai kecemasan?', opts:['Kurang 1 bulan','1-3 bulan','3-6 bulan','Lebih 6 bulan'], scores:[4,6,8,10] },
  { id:'k4',  dim:'kewangan',    weight:.04, title:'💰 Pelaburan Masa Depan',        q:'Cara terbaik untuk bina kekayaan jangka panjang?', opts:['ASB / Tabung Haji','Hartanah','Saham / Unit Amanah','Perniagaan sendiri'], scores:[7,8,8,9] },
  { id:'k5',  dim:'kewangan',    weight:.04, title:'💰 Hutang & Komitmen',           q:'Pendapat anda tentang hutang kad kredit?', opts:['Bayar penuh setiap bulan — tiada hutang!','Bayar minimum asalkan ada cashflow','Elak guna kad kredit langsung','Guna bijak untuk point & cashback, bayar penuh'], scores:[8,4,7,10] },

  // — KELUARGA (Family) —
  { id:'f1',  dim:'keluarga',    weight:.06, q:'Seberapa penting restu ibu bapa dalam keputusan perkahwinan? (1=Tidak penting, 10=Wajib)', q_type:'slider', title:'👨‍👩‍👧 Keluarga & Restu' },
  { id:'f2',  dim:'keluarga',    weight:.05, title:'👨‍👩‍👧 Tanggungjawab Ibu Bapa',     q:'Selepas berkahwin, tanggungjawab terhadap ibu bapa?', opts:['Mereka masih keutamaan utama bersama pasangan','Pasangan jadi keutamaan, tapi ibu bapa tetap dijaga','Keseimbangan bergantung situasi','Pasangan adalah tanggungjawab utama'], scores:[8,8,9,6] },
  { id:'f3',  dim:'keluarga',    weight:.04, title:'👨‍👩‍👧 Hubungan Adik-Beradik',      q:'Adik-beradik yang selalu meminta bantuan kewangan?', opts:['Bantu selagi mampu, keluarga adalah keutamaan','Bantu tapi ada had dan syarat','Berbincang dengan pasangan dulu sebelum bantu','Keluarga masing-masing tanggungjawab sendiri'], scores:[7,8,9,6] },
  { id:'f4',  dim:'keluarga',    weight:.04, title:'👨‍👩‍👧 Rumah Keluarga Besar',       q:'Tinggal bersama atau berdekatan ibu bapa selepas kahwin?', opts:['Tinggal bersama — jimat & senang jaga','Berdekatan tapi rumah berasingan','Di mana rezeki ada — fleksibel','Nak privacy, jauh sedikit tidak mengapa'], scores:[7,9,8,7] },

  // — AGAMA (Religion) —
  { id:'a1',  dim:'agama',       weight:.06, title:'🕌 Nilai Agama',                 q:'Amalan agama harian pasangan adalah:', opts:['Sangat penting — soleh/solehah','Penting — solat 5 waktu','Perlu ada tetapi tidak ketat','Urusan peribadi masing-masing'], scores:[10,8,6,4] },
  { id:'a2',  dim:'agama',       weight:.05, title:'🕌 Ilmu Agama',                  q:'Seberapa dalam ilmu agama yang anda harapkan pada pasangan?', opts:['Hafaz al-Quran / Ustaz/Ustazah','Faham fiqah asas & amalkan','Ada asas agama yang kukuh','Cukup asal tak tinggal solat'], scores:[10,9,7,5] },
  { id:'a3',  dim:'agama',       weight:.04, title:'🕌 Amalan Harian',               q:'Program agama yang anda ingin amalkan bersama pasangan?', opts:['Solat berjemaah setiap waktu','Kelas agama mingguan bersama','Bacaan Quran malam bersama','Usrah/halaqah komuniti'], scores:[10,8,9,8] },
  { id:'a4',  dim:'agama',       weight:.04, title:'🕌 Pakaian & Adab',              q:'Gaya berpakaian pasangan yang anda harapkan?', opts:['Menutup aurat sepenuhnya (tudung/songkok)','Sopan & kemas, tidak perlu ketat','Bergaya tapi beradab','Saya tidak kisah selagi bersih'], scores:[9,7,6,5] },

  // — KONFLIK (Conflict) —
  { id:'c1',  dim:'konflik',     weight:.04, title:'🤝 Pengurusan Konflik',           q:'Apabila berlaku perbalahan dengan pasangan:', opts:['Berbincang dengan tenang','Beri ruang dahulu','Minta penengah','Tulis mesej/surat'], scores:[9,8,7,6] },
  { id:'c2',  dim:'konflik',     weight:.04, title:'🤝 Selepas Bertengkar',           q:'Selepas bergaduh, siapa yang patut minta maaf dulu?', opts:['Yang bersalah patut minta maaf','Saya yang biasanya akan tunduk dulu','Dua-dua kena minta maaf sama-sama','Maaf-memaafi ikut keadaan'], scores:[8,6,10,8] },
  { id:'c3',  dim:'konflik',     weight:.03, title:'🤝 Topik Sensitif',               q:'Topik paling sensitif yang susah dibincangkan?', opts:['Kewangan & hutang','Ibu bapa & mertua','Rancangan masa depan','Gaya hidup & tabiat'], scores:[8,7,8,7] },

  // — KERJAYA (Career) —
  { id:'kj1', dim:'kerjaya',     weight:.04, title:'💼 Kerjaya & Keseimbangan',      q:'Selepas berkahwin, anda bercadang:', opts:['Fokus kepada keluarga','Kerjaya sepenuh masa, kongsi tanggungjawab','Kerjaya separuh masa','Bergantung persetujuan bersama'], scores:[7,8,7,9] },
  { id:'kj2', dim:'kerjaya',     weight:.04, title:'💼 Kerja Lebih Masa',             q:'Pasangan kerap kerja overtime dan balik lewat?', opts:['Tidak apa — kerjaya penting','Boleh terima tapi ada had','Perlu berbincang dan cari penyelesaian','Saya utamakan masa bersama keluarga'], scores:[6,7,9,8] },
  { id:'kj3', dim:'kerjaya',     weight:.03, title:'💼 Pindah Kerja',                 q:'Pasangan dapat tawaran kerja bergaji tinggi di negeri lain?', opts:['Sokong sepenuhnya — pergi bersama','Sokong tapi kami kekalkan LDR dulu','Berbincang impak keluarga dulu','Keutamaan keluarga — tolak peluang itu'], scores:[8,7,9,7] },

  // — ANAK (Children) —
  { id:'an1', dim:'anak',        weight:.04, title:'👶 Perancangan Keluarga',        q:'Berapa ramai anak yang anda impikan?', opts:['1–2 anak','3–4 anak','5 ke atas','Bergantung rezeki & kemampuan'], scores:[7,8,6,9] },
  { id:'an2', dim:'anak',        weight:.04, title:'👶 Pendidikan Anak',             q:'Sekolah pilihan untuk anak?', opts:['Sekolah agama (SRAI/Tahfiz)','Sekolah kebangsaan + kelas agama','Sekolah swasta / antarabangsa','Bergantung minat & bakat anak'], scores:[9,8,7,8] },
  { id:'an3', dim:'anak',        weight:.03, title:'👶 Disiplin Anak',               q:'Cara mendisiplinkan anak yang anda setuju?', opts:['Tegur dengan hikmah & penuh kasih','Tegas tapi adil — ada ganjaran & dendaan','Ikut perkembangan psikologi moden','Perbincangan terbuka — libatkan anak'], scores:[9,8,8,9] },
  { id:'an4', dim:'anak',        weight:.03, title:'👶 Asuhan Anak',                 q:'Siapa yang utama jaga anak semasa kecil?', opts:['Ibu — sepenuh masa di rumah','Ayah & ibu kongsi sama rata','Hantar ke nurseri / pengasuh','Nenek datuk bantu jaga'], scores:[8,9,7,7] },

  // — KOMUNIKASI (Communication) —
  { id:'kom1',dim:'komunikasi',  weight:.04, title:'🗣️ Gaya Komunikasi',             q:'Dalam hubungan, anda lebih suka berkomunikasi:', opts:['Bersemuka','Panggilan telefon/video','Mesej bertulis','Campuran semua cara'], scores:[9,8,7,8] },
  { id:'kom2',dim:'komunikasi',  weight:.04, title:'🗣️ Frekuensi Komunikasi',        q:'Seberapa kerap anda nak berkomunikasi dengan pasangan?', opts:['Selalu — setiap masa','Beberapa kali sehari','Sehari sekali sudah cukup','Bila perlu & berguna sahaja'], scores:[7,9,8,6] },
  { id:'kom3',dim:'komunikasi',  weight:.03, title:'🗣️ Masalah Emosi',               q:'Bila pasangan ada masalah emosi, peranan anda?', opts:['Dengar dulu, baru bagi pendapat','Terus bagi penyelesaian praktikal','Bagi ruang & sokongan diam','Ajak keluar alih perhatian'], scores:[9,7,8,7] },

  // — RUMAH TANGGA (Household) —
  { id:'rt1', dim:'rumah_tangga',weight:.03, title:'🏠 Kewangan Rumah Tangga',       q:'Bagaimana uruskan kewangan selepas berkahwin?', opts:['Akaun bersama','Akaun berasingan, kongsi bil','Suami tanggung semua','Bincang dan buat sistem bersama'], scores:[8,7,6,9] },
  { id:'rt2', dim:'rumah_tangga',weight:.03, title:'🏠 Tanggungjawab Rumah',          q:'Siapa yang patut buat kerja rumah?', opts:['Kongsi sama rata','Ikut kemahiran masing-masing','Seorang buat kerja rumah, sorang kerja luar','Upah pembantu rumah kalau mampu'], scores:[9,8,7,7] },
  { id:'rt3', dim:'rumah_tangga',weight:.03, title:'🏠 Rumah Impian',                 q:'Rumah impian anda selepas berkahwin?', opts:['Apartment / kondominium di bandar','Teres / semi-D di taman perumahan','Bungalow dengan tanah luas','Kampung — tenang & dekat keluarga'], scores:[7,8,9,8] },

  // — GAYA HIDUP (Lifestyle) —
  { id:'gl1', dim:'gaya_hidup',  weight:.04, title:'🌍 Hujung Minggu Ideal',         q:'Hujung minggu ideal bersama pasangan:', opts:['Duduk rumah, masak, nonton','Aktiviti luar rumah','Travel tempat baru','Lawat keluarga'], scores:[8,8,7,9] },
  { id:'gl2', dim:'gaya_hidup',  weight:.03, title:'🌍 Cuti Tahunan',                 q:'Destinasi percutian yang anda impikan bersama pasangan?', opts:['Destinasi dalam negara (alam semula jadi)','Destinasi luar negara (Eropah / Jepun)','Umrah / Haji bersama','Staycation — rehat di hotel mewah tempatan'], scores:[8,7,10,8] },
  { id:'gl3', dim:'gaya_hidup',  weight:.03, title:'🌍 Hiburan & Masa Lapang',       q:'Cara menghabiskan masa santai bersama pasangan?', opts:['Menonton filem / drama','Masak bersama di rumah','Sukan & outdoor activities','Membaca atau belajar sesuatu bersama'], scores:[7,8,8,9] },

  // — KOMITMEN (Commitment) —
  { id:'ko1', dim:'komitmen',    weight:.04, title:'💍 Komitmen & Masa Depan',       q:'Anda bersedia berkahwin dalam tempoh:', opts:['Sebaik jumpa calon sesuai','6–12 bulan','1–2 tahun','Lebih dari 2 tahun'], scores:[8,9,7,6] },
  { id:'ko2', dim:'komitmen',    weight:.04, title:'💍 Tanda-Tanda Keseriusan',       q:'Apa yang membuktikan seseorang serius untuk berkahwin?', opts:['Perkenalkan kepada keluarga','Berbincang tentang kewangan bersama','Ada plan perkahwinan yang konkrit','Konsisten dalam perhatian & tindakan'], scores:[9,8,9,8] },
  { id:'ko3', dim:'komitmen',    weight:.03, title:'💍 Jangkaan Perkahwinan',         q:'Apa yang paling anda harapkan dari perkahwinan?', opts:['Ketenangan & kebahagiaan rumah tangga','Pasangan hidup yang saling sokong','Keluarga yang soleh/solehah','Kehidupan yang bermakna di dunia & akhirat'], scores:[8,9,9,10] },

  // — PEMIKIRAN (Thinking) —
  { id:'pm1', dim:'pemikiran',   weight:.03, title:'🧠 Cara Berfikir',               q:'Bagaimana anda membuat keputusan penting?', opts:['Ikut logik dan fakta','Ikut hati dan perasaan','Gabungan logik & hati','Berunding dengan orang dipercayai'], scores:[8,7,9,8] },
  { id:'pm2', dim:'pemikiran',   weight:.03, title:'🧠 Perubahan & Cabaran',         q:'Apabila menghadapi perubahan besar dalam hidup:', opts:['Terima dengan tenang & rancang','Risau tetapi cuba adaptasi','Lihat sebagai peluang baru','Perlukan masa untuk terima'], scores:[9,7,8,6] },
  { id:'pm3', dim:'pemikiran',   weight:.03, title:'🧠 Pandangan Politik & Sosial',  q:'Pandangan tentang isu sosial & politik?', opts:['Ikut ajaran agama sebagai panduan','Ikut akal & kajian sendiri','Tidak ambil peduli — fokus keluarga','Terbuka bincang tapi elak hujah panas'], scores:[8,8,6,9] },

  // — MAKANAN (Food) —
  { id:'m1',  dim:'makanan',     weight:.03, title:'🍽️ Tabiat Pemakanan',            q:'Gaya pemakanan harian anda:', opts:['Masak sendiri — utamakan sihat','Campuran masak sendiri & makan luar','Lebih suka makan di luar','Tidak kisah, ikut keadaan'], scores:[9,8,6,7] },
  { id:'m2',  dim:'makanan',     weight:.03, title:'🍽️ Minuman Kegemaran',           q:'Minuman harian anda:', opts:['Air kosong sahaja','Teh/kopi tanpa gula','Teh tarik, kopi, jus buah','Apa sahaja yang ada'], scores:[9,8,7,6] },
  { id:'m3',  dim:'makanan',     weight:.02, title:'🍽️ Masakan Kegemaran',           q:'Jenis masakan yang paling anda gemari:', opts:['Masakan Melayu tradisional','Pelbagai — suka cuba masakan baru','Masakan sihat/diet terkawal','Makanan ringkas & mudah'], scores:[8,8,9,7] },
  { id:'m4',  dim:'makanan',     weight:.02, title:'🍽️ Dating Makan',                q:'Date makan yang ideal bersama pasangan?', opts:['Masak bersama di rumah','Kedai makan tempatan yang best','Restoran fine dining istimewa','Picnic outdoor yang romantik'], scores:[9,8,7,8] },

  // — AKTIVITI (Activity) —
  { id:'ak1', dim:'aktiviti',    weight:.03, title:'🏃 Aktiviti Pagi',               q:'Rutin pagi ideal anda:', opts:['Solat subuh, zikir, baca Quran','Senaman/jogging pagi','Bangun awal, kemas rumah, sarapan','Tidur hingga saat terakhir'], scores:[9,8,8,5] },
  { id:'ak2', dim:'aktiviti',    weight:.03, title:'🏃 Aktiviti Petang',             q:'Selepas waktu kerja, anda suka:', opts:['Berehat di rumah, nonton TV','Bersenam atau bersukan','Keluar bersama keluarga/rakan','Kerjakan hobi peribadi'], scores:[7,8,8,8] },
  { id:'ak3', dim:'aktiviti',    weight:.02, title:'🏃 Sukan Kegemaran',             q:'Aktiviti sukan/rekreasi yang anda gemari?', opts:['Berjalan kaki / hiking','Badminton / futsal / bola sepak','Berenang / gimnasium','Tidak berminat sukan — lebih suka duduk'], scores:[8,8,8,5] },

  // — KEBERSIHAN (Cleanliness) —
  { id:'kb1', dim:'kebersihan',  weight:.03, title:'🧹 Kebersihan & Kekemasan',      q:'Tahap kekemasan rumah yang anda harapkan:', opts:['Sangat kemas — semuanya teratur','Kemas tetapi tidak obsesif','Selesa — tidak perlu sempurna','Tidak terlalu kisah'], scores:[9,8,7,5] },
  { id:'kb2', dim:'kebersihan',  weight:.02, title:'🧹 Pembahagian Kerja Rumah',     q:'Tentang kerja rumah selepas kahwin:', opts:['Kongsi sama rata','Ikut kebolehan masing-masing','Satu pihak lebih banyak, satu lagi kerja luar','Upah pembantu rumah'], scores:[9,8,7,7] },
  { id:'kb3', dim:'kebersihan',  weight:.02, title:'🧹 Kebersihan Diri',             q:'Standard kebersihan & penampilan diri yang anda harapkan pada pasangan?', opts:['Sangat kemas & sentiasa rapi','Kemas bila keluar, santai di rumah','Yang penting bersih & wangi','Saya tidak terlalu kisah penampilan'], scores:[9,8,7,5] },

  // — HOBI (Hobbies) —
  { id:'h1',  dim:'hobi',        weight:.03, title:'📚 Hobi: Membaca',               q:'Tabiat membaca anda:', opts:['Suka sangat — baca setiap hari','Suka — baca beberapa kali seminggu','Kadang-kadang sahaja','Jarang/tidak suka membaca'], scores:[10,8,6,4] },
  { id:'h2',  dim:'hobi',        weight:.03, title:'🌍 Hobi: Mengembara',            q:'Minat mengembara anda:', opts:['Sangat suka — rancang perjalanan kerap','Suka — sekali setahun sudah cukup','Ikut keadaan & bajet','Tidak berminat sangat'], scores:[9,8,7,5] },
  { id:'h3',  dim:'hobi',        weight:.02, title:'🎨 Hobi: Kreativiti',            q:'Aktiviti kreatif yang anda suka?', opts:['Memasak / baking','Melukis / kraf tangan / DIY','Fotografi / videografi','Menulis / blogging / journaling'], scores:[8,8,8,8] },
  { id:'h4',  dim:'hobi',        weight:.02, title:'🎮 Hobi: Teknologi & Hiburan',   q:'Cara anda berhibur di waktu lapang?', opts:['Menonton drama / filem / dokumentari','Main video game','Podcast / YouTube edukatif','Scroll media sosial'], scores:[7,6,9,5] },

  // — SOSIAL (Social) —
  { id:'s1',  dim:'sosial',      weight:.03, title:'🤝 Pergaulan Sosial',            q:'Tahap pergaulan sosial anda:', opts:['Introvert — lebih suka masa sendiri/keluarga','Ambivert — seimbang','Ekstrovert — suka berjumpa ramai orang','Bergantung mood & keadaan'], scores:[7,9,7,8] },
  { id:'s2',  dim:'sosial',      weight:.02, title:'🤝 Media Sosial',                q:'Penggunaan media sosial anda:', opts:['Sangat minima — jarang guna','Sederhana — sekadar perlu','Aktif — suka berkongsi','Sangat aktif — sebahagian hidup'], scores:[8,9,7,5] },
  { id:'s3',  dim:'sosial',      weight:.02, title:'🤝 Kawan-Kawan Pasangan',        q:'Pasangan yang masih rapat dengan kawan-kawan lama?', opts:['Sokong — kawan adalah penting','Boleh tapi ada sempadan masa','Bergantung siapa kawan-kawannya','Saya lebih suka kami fokus sesama sendiri'], scores:[8,8,7,5] },

  // — EMOSI (Emotions) —
  { id:'e1',  dim:'emosi',       weight:.04, title:'❤️ Bahasa Cinta',               q:'Cara anda menunjukkan kasih sayang:', opts:['Kata-kata pujian & dorongan','Masa berkualiti bersama','Hadiah & kejutan kecil','Sentuhan fizikal & pelukan'], scores:[8,9,7,8] },
  { id:'e2',  dim:'emosi',       weight:.03, title:'❤️ Kematangan Emosi',           q:'Apabila anda merasa sedih atau tertekan:', opts:['Berdoa & berserah kepada Allah','Berbincang dengan orang terdekat','Bersendirian untuk berfikir','Sibukkan diri dengan aktiviti'], scores:[9,8,7,7] },
  { id:'e3',  dim:'emosi',       weight:.03, title:'❤️ Cemburu & Kepercayaan',      q:'Pasangan yang rapat dengan rakan berlainan jantina?', opts:['Percaya penuh — tidak ada masalah','Ada sedikit rasa tidak selesa tapi percaya','Perlu bincang dan tetapkan had','Tidak selesa — saya ada had yang jelas'], scores:[7,8,9,7] },
  { id:'e4',  dim:'emosi',       weight:.03, title:'❤️ Pengakuan Perasaan',         q:'Senang atau susah untuk anda luahkan perasaan?', opts:['Mudah — saya orang yang ekspresif','Boleh tapi perlu masa yang sesuai','Susah tapi saya cuba','Saya lebih suka tunjuk melalui tindakan'], scores:[8,8,7,8] },

  // — MASA DEPAN (Future) —
  { id:'md1', dim:'masa_depan',  weight:.03, title:'🎯 Visi 5 Tahun',               q:'Dalam 5 tahun, anda ingin:', opts:['Sudah berkahwin, ada anak, rumah sendiri','Kerjaya stabil, simpanan kukuh','Mengembara bersama keluarga','Memberi sumbangan kepada masyarakat'], scores:[9,8,7,8] },
  { id:'md2', dim:'masa_depan',  weight:.03, title:'🎯 Pendidikan Anak',            q:'Pendekatan pendidikan anak pilihan anda:', opts:['Agama & akademik seimbang','Akademik diutamakan','Kemahiran hidup & kreativiti','Ikut minat anak'], scores:[9,7,8,8] },
  { id:'md3', dim:'masa_depan',  weight:.03, title:'🎯 Persaraan & Usia Tua',       q:'Perancangan untuk hari tua?', opts:['Simpan dalam KWSP & aset hartanah','Bergantung pada anak-anak','Bina perniagaan pasif yang menjana pendapatan','Masih belum fikir lagi'], scores:[9,7,9,3] },

  // — TEKNOLOGI (Technology) —
  { id:'tk1', dim:'teknologi',   weight:.02, title:'📱 Teknologi & Privasi',         q:'Hubungan anda dengan teknologi:', opts:['Gunakan sekadar perlu','Agak mahir & selesa','Sangat bergantung — sukar berpisah','Lebih suka cara tradisional'], scores:[8,9,5,7] },
  { id:'tk2', dim:'teknologi',   weight:.02, title:'📱 Privasi Telefon Pasangan',    q:'Adakah pasangan perlu tahu password telefon anda?', opts:['Ya — tiada rahsia antara suami isteri','Tidak perlu tapi boleh periksa bila-bila masa','Privasi penting — hanya dalam situasi tertentu','Tidak — telefon adalah privasi mutlak'], scores:[9,8,7,4] },

  // — PERSONALITI (Personality) —
  { id:'p1',  dim:'personaliti', weight:.03, title:'✨ Sifat Utama Diri',           q:'Sifat yang paling menggambarkan anda:', opts:['Penyabar & penyayang','Tegas tetapi adil','Kreatif & spontan','Teratur & berdisiplin'], scores:[9,8,7,8] },
  { id:'p2',  dim:'personaliti', weight:.03, title:'✨ Reaksi Terhadap Tekanan',    q:'Apabila berada di bawah tekanan yang tinggi?', opts:['Tenang & fikir penyelesaian langkah demi langkah','Cari sokongan dari orang tersayang','Withdrawal — perlukan ruang sendiri','Meletup sekejap tapi cepat pulih'], scores:[9,8,7,6] },
  { id:'p3',  dim:'personaliti', weight:.02, title:'✨ Sense of Humor',              q:'Adakah humor penting dalam hubungan?', opts:['Sangat penting — kena boleh gelak sama-sama','Penting tapi ada masanya jadi serius','Kurang penting — saya lebih suka serious','Bergantung pada konteks'], scores:[9,8,5,7] },
  { id:'p4',  dim:'personaliti', weight:.02, title:'✨ Perfeksionis',                q:'Adakah anda seorang perfeksionis?', opts:['Ya sangat — saya mahukan yang terbaik','Sederhana — standard tinggi tapi fleksibel','Tidak — yang penting siap dan baik','Bergantung pada perkara yang penting'], scores:[7,9,6,8] },
];

// Pick 30 random questions each session (ensure at least 1 from key dimensions)
let PSY_QS = [];
function initPsyQuestions() {
  const shuffled = [...PSY_BANK].sort(() => Math.random() - 0.5);
  // Ensure at least one slider (keluarga restu) is included
  const mustHave = PSY_BANK.find(q => q.q_type === 'slider');
  const rest = shuffled.filter(q => q.id !== mustHave.id).slice(0, 29);
  const pool = [mustHave, ...rest].sort(() => Math.random() - 0.5);
  PSY_QS = pool.slice(0, 30).map((q, i) => ({ ...q, _idx: i }));
}


const psyAns = {};

// ══════════ BUILD TEST ══════════
function buildPsychTest() {
  const prog = document.getElementById('psy-prog');
  if (prog) prog.innerHTML = PSY_QS.map((_, i) => `<div class="sp${i === 0 ? ' cur' : ''}" id="sp${i}" style="min-width:4px"></div>`).join('');
  const qwrap = document.getElementById('psy-qs'); if (!qwrap) return;
  document.getElementById('psy-res').style.display = 'none';
  document.getElementById('psy-freetext').style.display = 'none';
  document.getElementById('psy-q-ind').textContent = '1/' + PSY_QS.length;

  qwrap.innerHTML = PSY_QS.map((q, i) => {
    if (q.q_type === 'slider') {
      return `<div id="pq${i}" class="pq${i === 0 ? ' show' : ''} glass" style="border-radius:22px;padding:22px;margin-bottom:2px">
        <div style="margin-bottom:14px"><h3 class="serif" style="font-size:18px;font-weight:700;margin-bottom:7px">${q.title}</h3><p style="font-size:13px;color:var(--t2);line-height:1.6">${q.q}</p></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:10px;color:var(--t3)">Tidak penting</span><span style="font-size:10px;color:var(--t3)">Wajib</span></div>
        <input type="range" id="psr${i}" min="1" max="10" value="7" oninput="document.getElementById('psrv${i}').textContent=this.value+'/10';psyAns['${q.id}']={val:parseFloat(this.value),score:parseFloat(this.value)}"/>
        <div style="text-align:center;margin-top:10px"><span class="serif gold" style="font-size:30px;font-weight:800" id="psrv${i}">7/10</span></div>
        <button class="btn btn-p" style="margin-top:14px" onclick="psyGoNext(${i})">Seterusnya →</button>
      </div>`;
    }
    return `<div id="pq${i}" class="pq${i === 0 ? ' show' : ''} glass" style="border-radius:22px;padding:22px;margin-bottom:2px">
      <div style="margin-bottom:12px"><h3 class="serif" style="font-size:18px;font-weight:700;margin-bottom:7px">${q.title}</h3><p style="font-size:13px;color:var(--t2);line-height:1.6">${q.q}</p></div>
      ${q.opts.map((o, j) => `<div class="pq-opt" id="pqo${i}_${j}" onclick="selPsyOpt(${i},${j},'${q.id}',${q.scores[j]})"><div class="cb" id="pqcb${i}_${j}"></div><span style="font-size:12px;color:var(--t2);line-height:1.5">${esc(o)}</span></div>`).join('')}
      <div id="pqmsg${i}" style="font-size:10px;color:var(--t3);margin-top:5px"></div>
      <button class="btn btn-p" style="margin-top:12px" onclick="psyGoNext(${i})">${i === PSY_QS.length - 1 ? 'Seterusnya — Keperibadian Tambahan →' : 'Seterusnya →'}</button>
    </div>`;
  }).join('');
}

function selPsyOpt(qi, j, qid, score) {
  PSY_QS[qi].opts.forEach((_, k) => {
    const cb = document.getElementById(`pqcb${qi}_${k}`), row = document.getElementById(`pqo${qi}_${k}`);
    if (cb) cb.classList.remove('on'); if (row) row.classList.remove('sel');
  });
  const cb = document.getElementById(`pqcb${qi}_${j}`), row = document.getElementById(`pqo${qi}_${j}`);
  if (cb) cb.classList.add('on'); if (row) row.classList.add('sel');
  psyAns[qid] = { val: j, score };
}

function psyGoNext(i) {
  const q = PSY_QS[i];
  if (!q.q_type && !psyAns[q.id]) { const msg = document.getElementById('pqmsg' + i); if (msg) msg.textContent = 'Sila pilih jawapan dahulu.'; return; }
  if (q.q_type === 'slider') { const sl = document.getElementById('psr' + i); if (sl) psyAns[q.id] = { val: parseFloat(sl.value), score: parseFloat(sl.value) }; }

  if (i === PSY_QS.length - 1) {
    PSY_QS.forEach((_, i) => { const el = document.getElementById('pq' + i); if (el) el.classList.remove('show'); });
    document.getElementById('psy-freetext').style.display = 'block';
    document.getElementById('psy-q-ind').textContent = '✍️';
    window.scrollTo(0, 0); return;
  }

  const sp = document.getElementById('sp' + i); if (sp) { sp.classList.remove('cur'); sp.classList.add('done'); }
  const spn = document.getElementById('sp' + (i + 1)); if (spn) spn.classList.add('cur');
  document.getElementById('pq' + i).classList.remove('show');
  const next = document.getElementById('pq' + (i + 1)); if (next) next.classList.add('show');
  document.getElementById('psy-q-ind').textContent = (i + 2) + '/' + PSY_QS.length;
  window.scrollTo(0, 0);
}

// ══════════ FREE TEXT ══════════
document.addEventListener('DOMContentLoaded', () => {
  const ta = document.getElementById('psy-custom');
  if (ta) ta.addEventListener('input', () => {
    const len = ta.value.length;
    document.getElementById('char-count').textContent = len + ' / 500';
    if (len > 500) ta.value = ta.value.slice(0, 500);
  });
});

function submitFreeText() {
  const custom = document.getElementById('psy-custom').value.trim();
  S.psyCustomText = custom;
  document.getElementById('psy-freetext').style.display = 'none';
  psyCalcResult();
}

// ══════════ RESULTS ══════════
function psyCalcResult() {
  PSY_QS.forEach((_, i) => { const sp = document.getElementById('sp' + i); if (sp) { sp.classList.remove('cur'); sp.classList.add('done'); } });

  let totalW = 0, totalScore = 0;
  PSY_QS.forEach(q => { const ans = psyAns[q.id]; if (ans) { totalScore += ans.score * q.weight; totalW += q.weight; } });
  const finalScore = totalW > 0 ? totalScore / totalW : 7;

  const dims = {};
  PSY_QS.forEach(q => { const ans = psyAns[q.id]; if (ans) { if (!dims[q.dim]) dims[q.dim] = []; dims[q.dim].push(ans.score); } });
  const avgDims = {};
  Object.entries(dims).forEach(([k, arr]) => { avgDims[k] = arr.reduce((a, b) => a + b, 0) / arr.length; });
  S.psyDims = avgDims;

  const finScore = parseFloat(finalScore.toFixed(1));
  let ptype = '', pdesc = '';
  const custom = S.psyCustomText ? ` Tambahan dari pengguna: ${S.psyCustomText}.` : '';

  if (finScore >= 8.5) { ptype = 'Pemimpin Keluarga Berwibawa'; pdesc = `Anda mempunyai nilai kekeluargaan yang sangat kuat, komited, dan stabil dari segi kewangan dan emosi. Anda seorang yang bertanggungjawab, mempunyai visi masa depan yang jelas, dan sangat mengutamakan agama serta restu keluarga. Gaya komunikasi anda matang dan anda mampu menguruskan konflik dengan bijak. Anda adalah calon yang sangat ideal untuk perkahwinan jangka panjang.${custom}`; }
  else if (finScore >= 7) { ptype = 'Pasangan Seimbang & Matang'; pdesc = `Anda mempunyai keseimbangan yang baik antara kerjaya, keluarga, dan nilai peribadi. Anda fleksibel tetapi berprinsip, mampu berkomunikasi dengan baik, dan menghargai masa berkualiti bersama pasangan. Anda seorang yang terbuka tetapi masih menjaga batasan agama dan budaya. Potensi untuk membina keluarga harmoni sangat tinggi.${custom}`; }
  else if (finScore >= 5.5) { ptype = 'Penjelajah Hubungan'; pdesc = `Anda masih dalam proses memahami keutamaan anda dalam perhubungan. Keterbukaan anda terhadap pengalaman baru adalah kekuatan, tetapi anda mungkin perlu lebih jelas tentang nilai-nilai asas yang anda cari dalam pasangan. Teruskan meneroka dan kenali diri anda dengan lebih mendalam.${custom}`; }
  else { ptype = 'Individu Berkembang'; pdesc = `Anda mempunyai potensi besar dalam membina perhubungan. Pengalaman dan pembelajaran berterusan akan membantu anda memahami apa yang benar-benar anda mahukan dalam pasangan hidup. Pertimbangkan untuk mengukuhkan nilai-nilai asas anda terlebih dahulu.${custom}`; }

  const traits = [];
  if (avgDims.agama >= 8) traits.push('Spiritual');
  if (avgDims.keluarga >= 8) traits.push('Mengutamakan Keluarga');
  if (avgDims.kewangan >= 8) traits.push('Bijak Kewangan');
  if (avgDims.komunikasi >= 8) traits.push('Komunikatif');
  if (avgDims.kebersihan >= 8) traits.push('Kemas & Teratur');
  if (avgDims.hobi >= 8) traits.push('Suka Membaca');
  if (avgDims.makanan >= 8) traits.push('Pemakanan Sihat');
  if (avgDims.aktiviti >= 8) traits.push('Aktif & Bertenaga');
  if (avgDims.emosi >= 8) traits.push('Matang Emosi');
  if (avgDims.sosial >= 8) traits.push('Pandai Bergaul');
  if (avgDims.komitmen >= 8) traits.push('Komited');
  if (avgDims.pemikiran >= 8) traits.push('Analitikal');
  if (traits.length < 3) { traits.push('Potensi Tinggi'); traits.push('Terbuka'); }

  S.psyScore = finScore; S.psyType = ptype; S.psyDesc = pdesc; S.psyTraits = traits; S.psyDone = true; save();

  document.getElementById('psy-sc').textContent = finScore.toFixed(1);
  document.getElementById('psy-type').textContent = ptype;
  document.getElementById('psy-desc').textContent = pdesc;

  const dimLabels = { kewangan: '💰 Kewangan', keluarga: '👨‍👩‍👧 Keluarga', konflik: '🤝 Konflik', agama: '🕌 Agama', kerjaya: '💼 Kerjaya', anak: '👶 Anak', komunikasi: '🗣️ Komunikasi', rumah_tangga: '🏠 Rumah Tangga', gaya_hidup: '🌍 Gaya Hidup', komitmen: '💍 Komitmen', pemikiran: '🧠 Pemikiran', makanan: '🍽️ Makan/Minum', aktiviti: '🏃 Aktiviti', kebersihan: '🧹 Kebersihan', hobi: '📚 Hobi', sosial: '🤝 Sosial', emosi: '❤️ Emosi', masa_depan: '🎯 Visi', teknologi: '📱 Teknologi', personaliti: '✨ Personaliti' };
  const dimWrap = document.getElementById('psy-dim-wrap');
  if (dimWrap) dimWrap.innerHTML = [...Object.entries(avgDims), ...traits.map(t => [t, null])].map(([k, v]) => {
    if (v === null) return `<span class="trait-tag trait-positive">${esc(k)}</span>`;
    return `<div style="background:var(--s3);border:1px solid var(--gborder);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:500;color:var(--t2)">${dimLabels[k] || k}: <span style="color:${v >= 8 ? 'var(--green)' : v >= 6 ? 'var(--gold)' : 'var(--t2)'};font-weight:700">${v.toFixed(1)}/10</span></div>`;
  }).join('');

  document.getElementById('psy-res').style.display = 'block';
  document.getElementById('psy-q-ind').textContent = '✓';
  toast('🏆 Ujian 30 dimensi selesai! Skor: ' + finScore.toFixed(1) + '/10', 'ok', 5000);
}
