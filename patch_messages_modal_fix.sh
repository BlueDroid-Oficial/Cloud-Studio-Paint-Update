#!/bin/bash
sed -i 's/{state.showMessagesModal \&\& <MessagesModal isOpen={true} onClose={() => state.setShowMessagesModal(false)} \/>}/<MessagesModal isOpen={state.showMessagesModal} onClose={() => state.setShowMessagesModal(false)} \/>/g' src/App.tsx
