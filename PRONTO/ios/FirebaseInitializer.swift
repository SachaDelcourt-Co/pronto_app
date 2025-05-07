import Foundation
import FirebaseCore

@objc public class FirebaseInitializer: NSObject {
    @objc public static func configure() {
        if FirebaseApp.app() == nil {
            print("Configuring Firebase...")
            FirebaseApp.configure()
            print("Firebase configured successfully!")
        } else {
            print("Firebase already configured.")
        }
    }
} 