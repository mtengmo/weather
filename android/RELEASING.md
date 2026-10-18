# Releasing the Android app

This covers the one-time setup for signed releases and how to cut one. Workflows:

- `.github/workflows/android.yml` runs on pull requests and pushes to `main` that touch `android/**`. It runs unit tests and builds a debug APK. It needs no secrets.
- `.github/workflows/android-release.yml` runs on a tag `android-v*` or manually. It builds a signed AAB and APK, attaches them to a GitHub Release (tag runs only), and uploads the AAB to the Google Play **internal** testing track if the Play secret is set.

Everything below works the same for a public or private repository. Secrets are available only to workflows running in the repository itself, so forks' pull requests never see them.

## 1. Create the upload keystore (once)

Run this in PowerShell from a folder **outside** the repository (for example `C:\Users\<you>\secrets`). Never commit the file. `*.jks` and `*.keystore` are git-ignored, but keep it out of the repo anyway.

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

- Choose one password and use it for both the keystore and the key (PKCS12 requires them to match).
- Remember the alias you chose (`upload` in the example).
- Back up `upload-keystore.jks` and both passwords in a password manager. If you lose the upload key, Play support must reset it before you can publish again.

## 2. Base64-encode the keystore (for the GitHub secret)

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\<you>\secrets\upload-keystore.jks")) | Set-Clipboard
```

`Set-Clipboard` copies a single line of text, ready to paste into the secret. To verify, you can also write it to a file with `| Set-Content upload-keystore.b64` and check that it is one line with no line breaks.

## 3. Add GitHub secrets

Repository **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Required | Value |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | yes | The single-line base64 text from step 2 |
| `ANDROID_KEYSTORE_PASSWORD` | yes | The keystore password |
| `ANDROID_KEY_ALIAS` | yes | The key alias (`upload` in the example) |
| `ANDROID_KEY_PASSWORD` | yes | The key password (same as the keystore password above) |
| `PLAY_SERVICE_ACCOUNT_JSON` | only for Play upload | The full JSON key of the Play service account (step 4) |
| `OPENWEATHERMAP_API_KEY` | optional | Enables the map's Temperature and Wind overlays in release builds, as on the web app |

The release workflow fails early if any of the first four are missing. The Play step is skipped when `PLAY_SERVICE_ACCOUNT_JSON` is absent, so the GitHub Release still gets created.

## 4. Google Play service account (for automatic uploads)

Play requires the app to exist and its first release to be uploaded by hand. Do step 5 before the automatic upload can work.

1. In Google Play Console, create the app `com.tengmo.vader`, and complete the required declarations (store listing basics, content rating, data safety, and so on).
2. Link a Google Cloud project under **Setup → API access** in Play Console. The menu location has moved in recent Console versions; search for "API access" if you cannot find it.
3. Create a service account in that Google Cloud project, create a JSON key for it, and paste the whole JSON file into the `PLAY_SERVICE_ACCOUNT_JSON` secret.
4. Back in Play Console, grant that service account access to the app. The "Release apps to testing tracks" permission is enough for the internal track.

## 5. First upload (manual, once)

1. Build the first AAB locally, or download the `android-release` artifact from a manual run of the release workflow.
2. In Play Console, open the app, go to **Testing → Internal testing → Create new release**, upload `app-release.aab`, and roll it out.
3. Play App Signing: accept the default enrollment. Google then holds the app signing key, and the keystore from step 1 is the **upload** key. Subsequent AABs signed with that upload key are accepted.

After this, the release workflow can upload automatically.

## 6. Cut a release

1. In `android/app/build.gradle.kts`, bump `versionName` (for example `"1.0.1"`). You do not bump `versionCode` by hand: CI sets it from the workflow run number, so every upload is strictly higher than the one before.
2. Commit and push the change to `main`.
3. Tag the same commit and push the tag. The tag must be `android-v` followed by the `versionName`:

   ```powershell
   git tag android-v1.0.1
   git push origin android-v1.0.1
   ```

4. The release workflow checks that the tag matches `versionName` and fails otherwise. When it passes, it builds and tests, creates the GitHub Release with the AAB and APK attached, and uploads the AAB to the internal track.

To run a build without a tag (for example to test the signing secrets or to push another internal build), use **Actions → Android Release → Run workflow**. The tag check is skipped, no GitHub Release is created, and the AAB is still uploaded to Play if the secret is set. Its `versionCode` is still the run number, so it is newer than earlier runs.

## Notes

- Local debug builds need no secrets. To test a release build locally, set `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` as environment variables (or the matching Gradle properties), then run `.\gradlew.bat :app:bundleRelease`. Without `ANDROID_KEYSTORE_PATH`, the release build is produced unsigned.
- `versionCode` for a local manual upload must be higher than the latest CI upload. If you upload by hand, use a number clearly above the run number (for example, check the latest run number in Actions first).
- `android/gradlew` should be executable in git. The workflows run `chmod +x` to be safe, but to fix the mode in the repository run `git update-index --chmod=+x android/gradlew` and commit.
