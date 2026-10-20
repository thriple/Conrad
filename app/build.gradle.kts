plugins {
  alias(libs.plugins.android.application)
}

// Each GitHub build gets a higher version code so a new APK installs over the old one.
val buildNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

android {
  namespace = "com.conrad.demo"
  compileSdk { version = release(36) { minorApiLevel = 1 } }

  defaultConfig {
    applicationId = "com.conrad.demo"
    minSdk = 26
    targetSdk = 36
    versionCode = buildNumber
    versionName = "0.1.$buildNumber"
  }

  signingConfigs {
    create("shared") {
      storeFile = file("${rootDir}/debug.keystore")
      storePassword = "android"
      keyAlias = "androiddebugkey"
      keyPassword = "android"
    }
  }

  buildTypes {
    debug { signingConfig = signingConfigs.getByName("shared") }
    release {
      isMinifyEnabled = false
      signingConfig = signingConfigs.getByName("shared")
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
  }
}

dependencies {
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.activity.ktx)
  implementation(libs.androidx.webkit)
}
