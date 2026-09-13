# 角色素材

棘背龙形态使用用户审核通过的 `hakimi-arched-hiss.png`，来源为 `output/character-drafts/hakimi-arched-hiss-v1.png`。玩家变身和形态拾取物共用此素材，以原比例绘制，支持移动起伏、倾斜及受击闪光；加载失败时保留程序绘制作为回退。生成提示词见 `output/character-drafts/hakimi-arched-hiss-v1-prompt.txt`。

内置 image_gen 生成，并按用户反馈进一步扁平化。角色顺序：哈基米（玩家）、耄耋（精英）、大狗叫（普通敌人）。

已实装用户提供的抠图透明 PNG：`image (1).png` → `hakimi.png`，`image.png` → `maodie.png`，`image (2).png` → `dagoujiao.png`。后续替换本目录同名透明 PNG 并刷新即可，无需修改代码。透明留白会自动适配，素材会预缓存为 256×256 并生成受击闪白版本。没有透明背景或加载失败时仍显示原程序绘制角色。

## 最终风格调整提示词

Edit target: attached cartoon animal sprite. User requests one more step toward FLAT simple cartoon art. Preserve its identity, recognizable meme expression, silhouette, pose and proportions. Redraw interior with completely uniform SOLID fills, absolutely zero gradients, zero illumination, zero texture or volume rendering. Think simple hand-drawn Canvas game icon, bold charcoal outlines and large clean color regions. Remove ALL cheek/nose/body shading and highlights except a single tiny white eye dot. Simplify tabby markings to three forehead stripes and two cheek stripes per side. Dog fur should be one uniform tan fill, ears one flat slightly darker tan, no angular planes across face or legs; mouth one dark burgundy shape, tongue one muted pink shape, teeth cream. Cats cream muzzle/belly each a single uniform fill. Keep animal facial features and mood exactly recognizable. Do not add anything. One entire animal centered in square with breathing room, no text, no ground shadow. Genuinely transparent alpha background, no painted checkerboard or white rectangle; preserve transparency if present.

## 初始角色提示词

大狗叫最后一次单独调整的完整提示词见 `dagoujiao-prompt.txt`。当前三张素材均已完成抠图并带透明通道。历史大狗叫版本保留在 `output/character-drafts/dagoujiao-previous-transparent.png`。

Use case: stylized-concept. Asset type: single full-body 2D game character sprite for a Canvas survivor game. Input image 1 is animal identity reference; input image 2 is game art style reference only. Create ONE isolated character, square canvas, character centered occupying about 85% of canvas height with all ears and paws in frame. Genuinely transparent alpha background, no checkerboard painted in, no ground shadow, no scenery, no text. Match flat cartoon game art: bold smooth dark olive-charcoal outline (#202720), simple clean solid color shapes, minimal cel shading, muted warm earthy palette, no gradients, no realistic fur texture, no 3D. Keep face unmistakably recognizable from animal photo, readable at 50-70 px.

### hakimi

Subject: 哈基米 gray-olive tabby and white cat. Preserve its distinctive nearly spherical pear-shaped plump body, very wide cheeks, small triangular upright ears, widely spaced huge almost-black oval eyes with tiny highlights (not anime sparkles), gray tabby forehead stripes, white broad muzzle and large white belly, tiny gray-pink triangular nose, tiny gently curved mouth and two very short white paws. Face looks innocent blank and slightly pleading exactly as reference. Frontal view, squat full body with head blending into body.

### maodie

Subject: 耄耋 orange tabby meme cat. Preserve distinctive broad round slightly flattened face, ears pressed sideways and down (airplane ears), big dark pupils inside muted olive-gold eyes, serious bewildered mildly aggrieved expression, slanted upper eyelids, warm ginger forehead stripes and cheek stripes, pink-brown triangular nose, cream muzzle, small downturned closed mouth, thin cream whiskers. This is NOT a smiling generic kitten. Frontal view; large head dominates compact squat ginger body, two small paws visible. Use reference face proportions.

### dagoujiao

Subject: 大狗叫 tan golden-labrador-like barking meme dog. Preserve huge vertically wide-open dark burgundy mouth, cream sharp visible upper and lower teeth, dark pink tongue deep in mouth, huge rounded black nose above the mouth, small dark narrowed eyes, short drooping ears at sides, golden tan fur. Comically furious loud bark matching reference, not cute happy panting. Frontal slightly above view with head and open jaw dominant, squat body receding behind it and two front legs braced apart to either side, full paws in frame. Compact sprite silhouette, no gore.
