CREATE PROCEDURE `set_default_category` ()
BEGIN
DELETE FROM category WHERE name = 'People' AND type = 'Default';
INSERT INTO category(name, type, items, isPublic) VALUES ('People', 'Default', '[
{"name": "Katrin", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQofMSS_S9DwXRjNpvi91Pma_HaE-GEDc2n3jGKtiiq4YzPJiTeUmctoM5xQRyNd_AJtbo"},
{"name": "Paul", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSssRjq1tCY1dNpHYxtTKXotD82p9unUqdC847pUSS6atQujMYt-mLE2EzNHDn5Sem-B3I"},
{"name": "Charles", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRfoge2zEch1284gWNq1J01-8FLYOnm_9Kc3xOM3oUHzZptgh_NMzN_SR8lzx2tWpJSuq8"},
{"name": "Maria", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpsInO8j3MMr639p4IoRLOwslF193QGDp7dn417MIEjN96kOx5A5YMTj63XmhCvttQXRk"},
{"name": "Hans", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMkCAqo4cxpv4790jOodoQMMu2ojLhwuHTF591GA99bvXkH_PL76K6cYEa227DA9WnLkE"},
{"name": "Peter", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNdryfM0gfx4la0m2E6CA8B8z4Nmy-WhUjkRrpOpBMnTM0PbdvInTEIpDdv34oXdhFBJk"},
{"name": "Anne", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT351pn4LPYk-W1yzpKMwMdahCksoI0CG8DJMIZWjbMJU5bk093fszyDlLGyc5YpNlxhDU"},
{"name": "Joe", "picture": "https://dynamicmedia.livenationinternational.com/o/v/v/7897490e-2cd3-44e0-b620-78878419a7fc.jpg"},
{"name": "Daniel", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRahXXaYYbQUksozcnuMfetLT7NUZvDcMdv9cIyFc-XFPPX-Uicl1xfPwgqZnOXy3tvMn8"},
{"name": "Sophie", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFZhnQnRx2nEkQFjkohvzLx8bHMrwTelbYhhnRZVcJM0qoK8QwqKKJ4q9T97kMGiHuzKo"},
{"name": "Michael", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQp4tYVQJyNaGWqgbJ99s_HOUzWEtyxGTIQ0O7vgS7_NOwzXS84jMWFN80LIMly4j9crvg"},
{"name": "Sarah", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5wmPA-akV1dzrvz-2Z0Avnq1atpCWehxn99ukeLMNTf3ufk0JFTQfFgNZm77YZCSsTnQ"},
{"name": "Anthony", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTn8qzduCHlFtjFj6pEiF1yVk44-8lk9rD5-Z2XzqHUkDw7egtcPHFtECNrz4LJXBX8iFg"},
{"name": "Eric", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSp5HDjDPRN6x4LMZ3OIJLejrdnaILx7BybY_btZyE5AX09zVE8HsfnZ-CNzxSMs96xgqU"},
{"name": "Lucas", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQO72HRViVLH8U77qd9AvRbnG3Ijsff_iba_a3Dz1kyjYg1KfAz2PF8YKi-9Wa4WHry6R8"},
{"name": "Thomas", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpkXJOQhl4SE_37EzZkCVTjxowNovgMBoZAWrETCtDhcDiXxVNfl3__HZ0rnwu9sG2BtE"},
{"name": "Heather", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRoxeD2uFvNcBROL0hsaM7p1RRool_xKN-VbmRRwy1gHf0WmA8bDRpjVv4wkegJTWgrukQ"},
{"name": "Bernard", "picture": "https://www.seen.co.uk/cdn/shop/collections/story-list-_1__2.1538604080_copy.jpg"},
{"name": "Suzanne", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOO5f09ws-P30xpBPXNuNXVcek-FbqvN_C2JrTQibAP1IgtcoevOZcj0lMPptGrxxTdbs"},
{"name": "Roger", "picture": "https://blackeyewear.com/cdn/shop/articles/Babs_BlackEyewear-20-1-e1524675913149-scaled_39b914d8-6139-4e0a-9a71-5d0d579ec5cb.jpg"},
{"name": "Lucy", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQKzRx_1zUWxGC_8wKk0uDKfJROvtvvd1gNJzMhNJh7qJljA9OZH-IzeJCHbsIt3-2_t-0"},
{"name": "Herman", "picture": "https://www.realmenrealstyle.com/wp-content/uploads/2023/07/Glasses-for-Oval-shape.jpg"},
{"name": "Stephen", "picture": "https://img.freepik.com/free-photo/orthodontics-dental-care-stomatology-concept-close-up-portrait-handsome-asian-man-with-teeth-braces-smiling-pleased-looking-hopeful-happy-standing-white-background_1258-57143.jpg"},
{"name": "Lois", "picture": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHoXJv5Ky9_yu_6Lpri273myffvYAvWlmSjKWIJ0RyvFPGq2b2aOd0TllLyyw8GuxknwI"}
]', true);
END