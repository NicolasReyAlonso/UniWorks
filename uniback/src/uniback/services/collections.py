from uniback.api.crudie import BasicService
from uniback.persistence.models.core import Collection

class Service(BasicService):
    def __init__(self, sess):
        super().__init__(sess)
        self.orm = Collection
