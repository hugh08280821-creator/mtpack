# MT 준비물

MT 가는 친구들이 같이 쓰는 준비물·장보기 체크 페이지.

- **준비물**: 각자 챙길 것을 올리고 체크. 공용 준비물은 "내가 챙길게"로 담당 지정.
- **장보기**: 필요한 물건과 개수를 올려 두고, 마트에서 담을 때마다 체크(몇 개씩 담았는지, 누가 담았는지 표시).

데이터는 Firebase Realtime Database(`trips/{여행코드}`)에 저장되고 모든 사람에게 실시간으로 반영된다.
여행마다 주소 끝에 `#여행코드`가 붙고, 그 링크를 공유하면 된다.

```
npm install
npm run dev
```

`npm run deploy` 하면 빌드해서 gh-pages 브랜치로 올리고, GitHub Pages가 그 브랜치를 보여준다.

## Firebase 규칙

```json
{
  "rules": {
    "trips": {
      "$tripId": { ".read": true, ".write": true }
    }
  }
}
```
