#!/bin/bash
sed -i 's/<MessagesModal \/>/{state.showMessagesModal \&\& <MessagesModal isOpen={true} onClose={() => state.setShowMessagesModal(false)} \/>}/g' src/App.tsx
