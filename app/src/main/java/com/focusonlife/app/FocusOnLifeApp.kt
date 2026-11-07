package com.focusonlife.app

import android.app.Application
import com.focusonlife.app.data.AppDatabase

class FocusOnLifeApp : Application() {
    val database: AppDatabase by lazy { AppDatabase.get(this) }
}
